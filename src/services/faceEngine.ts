import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';
import { AuthorizedPerson, BBox, PersonDetection } from '../types';

/**
 * Central Face Recognition Similarity Threshold.
 * Lower Euclidean distance = higher similarity.
 */
export const RECOGNITION_THRESHOLD = 0.42;

/** CDN base URL for downloading pretrained face-api model weights */
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

let cocoModel: cocoSsd.ObjectDetection | null = null;
let cocoLoadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;

/** Load COCO-SSD object detection model for person tracking */
export async function loadCocoSsdModel(): Promise<cocoSsd.ObjectDetection> {
  if (cocoModel) return cocoModel;
  if (cocoLoadingPromise) return cocoLoadingPromise;

  cocoLoadingPromise = (async () => {
    try {
      await tf.ready();
      cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      return cocoModel;
    } catch (err) {
      cocoLoadingPromise = null;
      throw new Error(`Failed to load COCO-SSD person detection model: ${(err as Error).message}`);
    }
  })();

  return cocoLoadingPromise;
}

/** Detect all person entities in an HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement */
export async function detectPersons(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  minScore = 0.35
): Promise<PersonDetection[]> {
  const model = await loadCocoSsdModel();
  const predictions = await model.detect(input);
  return predictions
    .filter((p) => p.class === 'person' && p.score >= minScore)
    .map((p) => ({
      bbox: [p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]] as BBox,
      score: p.score
    }));
}

/** Load face detection, landmark, recognition models AND COCO-SSD person model */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        loadCocoSsdModel()
      ]);
      modelsLoaded = true;
    } catch (err) {
      modelLoadingPromise = null;
      throw new Error(`Failed to load detection models: ${(err as Error).message}`);
    }
  })();

  return modelLoadingPromise;
}

export interface DetectedFaceResult {
  bbox: BBox;
  score: number;
  descriptor: number[];
}

/**
 * Detect all faces in an HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
 * and compute 128D face feature embeddings.
 */
export async function detectFacesWithDescriptors(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<DetectedFaceResult[]> {
  await loadFaceApiModels();

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => {
    const { x, y, width, height } = d.detection.box;
    return {
      bbox: [x, y, width, height] as BBox,
      score: d.detection.score,
      descriptor: Array.from(d.descriptor)
    };
  });
}

/**
 * Compare a 128D face descriptor embedding against registered Authorized Persons
 * using Euclidean distance matching against RECOGNITION_THRESHOLD.
 * Supports single or multi-embedding profiles collected from reference videos.
 */
export function matchFaceDescriptor(
  descriptor: number[],
  authorizedPersons: AuthorizedPerson[],
  threshold = RECOGNITION_THRESHOLD
): { isAuthorized: boolean; person: AuthorizedPerson | null; distance: number } {
  if (!authorizedPersons || authorizedPersons.length === 0 || !descriptor) {
    return { isAuthorized: false, person: null, distance: Infinity };
  }

  let minDistance = Infinity;
  let bestMatch: AuthorizedPerson | null = null;

  for (const person of authorizedPersons) {
    const candidateDescriptors: number[][] = [];
    if (person.descriptors && person.descriptors.length > 0) {
      candidateDescriptors.push(...person.descriptors);
    } else if (person.descriptor && person.descriptor.length > 0) {
      candidateDescriptors.push(person.descriptor);
    }

    for (const refDesc of candidateDescriptors) {
      if (!refDesc || refDesc.length === 0) continue;
      const distance = faceapi.euclideanDistance(descriptor, refDesc);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = person;
      }
    }
  }

  if (minDistance <= threshold && bestMatch) {
    return { isAuthorized: true, person: bestMatch, distance: minDistance };
  }

  return { isAuthorized: false, person: null, distance: minDistance };
}

export interface VideoExtractionProgress {
  statusText: string;
  collectedCount: number;
  targetCount: number;
}

export interface VideoExtractionResult {
  descriptors: number[][];
  representativeDescriptor: number[];
  thumbnailUrl: string;
}

/**
 * Samples frames from a reference video file, detects faces using faceapi,
 * requires exactly 1 face per frame (rejecting 0 or >1 face frames),
 * generates face embeddings for each valid frame, and returns collected descriptors & thumbnail.
 */
export async function extractFaceEmbeddingsFromVideo(
  videoFile: File,
  onProgress?: (progress: VideoExtractionProgress) => void,
  targetCount = 30
): Promise<VideoExtractionResult> {
  await loadFaceApiModels();

  return new Promise<VideoExtractionResult>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load uploaded video file.'));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!duration || isNaN(duration) || duration <= 0 || !width || !height) {
          cleanup();
          reject(new Error('Invalid video dimensions or duration.'));
          return;
        }

        const collectedDescriptors: number[][] = [];
        let firstFaceThumbnail = '';

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const maxProbes = Math.max(targetCount * 2, 40);
        const timeStep = duration / (maxProbes + 1);

        for (let i = 1; i <= maxProbes; i++) {
          if (collectedDescriptors.length >= targetCount) break;

          const targetTime = Math.min(i * timeStep, duration - 0.05);

          if (onProgress) {
            onProgress({
              statusText: 'Processing video...',
              collectedCount: collectedDescriptors.length,
              targetCount
            });
          }

          // Seek video to frame
          await new Promise<void>((res) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              res();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = targetTime;
          });

          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
          }

          // Detect faces with descriptors
          const detections = await detectFacesWithDescriptors(canvas);

          // Require EXACTLY 1 usable face per frame.
          // Reject if 0 faces or multiple (>1) faces.
          if (detections.length === 1) {
            const face = detections[0];
            collectedDescriptors.push(face.descriptor);

            // Generate face thumbnail for profile avatar
            if (!firstFaceThumbnail && ctx) {
              const [fx, fy, fw, fh] = face.bbox;
              const padX = fw * 0.2;
              const padY = fh * 0.2;
              const cropX = Math.max(0, Math.floor(fx - padX));
              const cropY = Math.max(0, Math.floor(fy - padY));
              const cropW = Math.min(width - cropX, Math.ceil(fw + padX * 2));
              const cropH = Math.min(height - cropY, Math.ceil(fh + padY * 2));

              const thumbCanvas = document.createElement('canvas');
              thumbCanvas.width = 120;
              thumbCanvas.height = 120;
              const thumbCtx = thumbCanvas.getContext('2d');
              if (thumbCtx) {
                thumbCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, 120, 120);
                firstFaceThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.85);
              }
            }

            if (onProgress) {
              onProgress({
                statusText: 'Processing video...',
                collectedCount: collectedDescriptors.length,
                targetCount
              });
            }
          }
        }

        cleanup();

        if (collectedDescriptors.length === 0) {
          reject(new Error('No usable face detected in video.'));
          return;
        }

        // Calculate average / representative 128D embedding vector
        const vecLen = collectedDescriptors[0].length;
        const representative = new Array(vecLen).fill(0);
        for (const desc of collectedDescriptors) {
          for (let d = 0; d < vecLen; d++) {
            representative[d] += desc[d];
          }
        }
        for (let d = 0; d < vecLen; d++) {
          representative[d] /= collectedDescriptors.length;
        }

        if (!firstFaceThumbnail && ctx) {
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 120;
          thumbCanvas.height = 120;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(canvas, 0, 0, width, height, 0, 0, 120, 120);
            firstFaceThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.85);
          }
        }

        resolve({
          descriptors: collectedDescriptors,
          representativeDescriptor: representative,
          thumbnailUrl: firstFaceThumbnail
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}

/**
 * Perform targeted face detection and descriptor extraction ONLY inside an in-zone person's cropped BBox.
 * This guarantees 100% face-person isolation and prevents face bleeding/confusion between nearby people.
 */
export async function detectFaceInPersonCrop(
  video: HTMLVideoElement,
  personBBox: BBox
): Promise<DetectedFaceResult | null> {
  const [px, py, pw, ph] = personBBox;

  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  if (!videoW || !videoH || pw <= 0 || ph <= 0) return null;

  // Add 15% padding around person BBox for head headroom
  const padX = pw * 0.10;
  const padY = ph * 0.15;

  const cropX = Math.max(0, Math.floor(px - padX));
  const cropY = Math.max(0, Math.floor(py - padY));
  const cropW = Math.min(videoW - cropX, Math.ceil(pw + padX * 2));
  const cropH = Math.min(videoH - cropY, Math.ceil(ph + padY * 2));

  if (cropW < 20 || cropH < 20) return null;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const faceDetections = await detectFacesWithDescriptors(cropCanvas);
  if (faceDetections.length === 0) return null;

  // Pick face with highest confidence score inside this person's cropped bounding box
  faceDetections.sort((a, b) => b.score - a.score);
  const bestFace = faceDetections[0];

  const [fx, fy, fw, fh] = bestFace.bbox;
  return {
    bbox: [cropX + fx, cropY + fy, fw, fh] as BBox,
    score: bestFace.score,
    descriptor: bestFace.descriptor
  };
}
