import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CameraStatus,
  TrackedPerson,
  BBox,
  RestrictedZone,
  PolygonPoint,
  PersonZoneState,
  AuthorizedPerson,
  IntrusionStatus,
  SecurityIncident,
  PersonDetection
} from '../types';
import {
  detectFaceInPersonCrop,
  detectPersons,
  matchFaceDescriptor,
  loadFaceApiModels,
  RECOGNITION_THRESHOLD
} from '../services/faceEngine';
import { saveIncident, saveIncidentToFirestore } from '../services/incidentService';
import {
  Camera,
  Video,
  VideoOff,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Cpu,
  Users,
  Target,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX,
  ShieldCheck,
  Volume2,
  VolumeX
} from 'lucide-react';

const ZONES_STORAGE_KEY = 'stadium_sentinel_zones';
const AUTHORIZED_STORAGE_KEY = 'stadium_sentinel_authorized_persons';

// ─── Tracker & Temporal Constants ─────────────────────────────────────────────
const MATCH_THRESHOLD = 0.25;
const MAX_MISSED_FRAMES = 6;
const DEFAULT_ZONE_MIN_CONFIDENCE = 0.50;
const DEFAULT_PERSISTENCE_FRAMES = 5;
const DEFAULT_MIN_DWELL_SECONDS = 2.0;
/**
 * Consecutive AUTHORIZED detections required before a track is promoted to
 * AUTHORIZED status. This prevents a single noisy frame from granting clearance.
 */
const RECOGNITION_CONFIRM_FRAMES = 4;

type ModelStatus = 'IDLE' | 'LOADING' | 'READY' | 'ERROR';

// ─── Point-in-Polygon Algorithm (Normalized 0.0 - 1.0 Coordinates) ───────────
export function isPointInPolygon(
  point: { x: number; y: number },
  polygon: PolygonPoint[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// ─── Zone-First Person Tracker ───────────────────────────────────────────────
interface RecogBuffer {
  consCount: number;
  pendingName: string | null;
  pendingId: string | null;
  confirmedName: string | null;
  confirmedId: string | null;
  prevStatus: 'AUTHORIZED' | 'UNKNOWN';
}

class PersonTracker {
  private tracks: TrackedPerson[] = [];
  private nextId = 1;
  private videoW = 1;
  private videoH = 1;
  private recognitionBuffers = new Map<number, RecogBuffer>();

  setVideoDimensions(w: number, h: number) {
    this.videoW = w || 1;
    this.videoH = h || 1;
  }

  reset() {
    this.tracks = [];
    this.nextId = 1;
    this.recognitionBuffers.clear();
  }

  private bboxCenter(bbox: BBox): { cx: number; cy: number } {
    const cx = (bbox[0] + bbox[2] / 2) / this.videoW;
    const cy = (bbox[1] + bbox[3] / 2) / this.videoH;
    return { cx, cy };
  }

  private dist(ax: number, ay: number, bx: number, by: number): number {
    return Math.hypot(ax - bx, ay - by);
  }

  public applyRecognitionVote(
    trackId: number,
    rawStatus: 'AUTHORIZED' | 'UNKNOWN',
    rawName: string | null,
    rawId: string | null,
    distance: number
  ): { status: 'AUTHORIZED' | 'UNKNOWN'; name: string | null; id: string | null } {
    const buf = this.recognitionBuffers.get(trackId) ?? {
      consCount: 0,
      pendingName: null,
      pendingId: null,
      confirmedName: null,
      confirmedId: null,
      prevStatus: 'UNKNOWN' as const
    };

    if (rawStatus === 'AUTHORIZED') {
      const samePending = buf.pendingId === rawId;
      const newCount = samePending ? buf.consCount + 1 : 1;
      const isConfirmed = newCount >= RECOGNITION_CONFIRM_FRAMES;

      const updated: RecogBuffer = {
        consCount: newCount,
        pendingName: rawName,
        pendingId: rawId,
        confirmedName: isConfirmed ? rawName : buf.confirmedName,
        confirmedId: isConfirmed ? rawId : buf.confirmedId,
        prevStatus: isConfirmed ? 'AUTHORIZED' : buf.confirmedId ? 'AUTHORIZED' : 'UNKNOWN'
      };
      this.recognitionBuffers.set(trackId, updated);

      if (updated.prevStatus === 'AUTHORIZED' && buf.prevStatus !== 'AUTHORIZED') {
        console.info(
          `[SecurityEngine] Person #${trackId}: UNKNOWN → AUTHORIZED "${rawName}" ` +
          `(dist=${distance.toFixed(3)}, votes=${newCount})`
        );
      }

      return updated.confirmedId
        ? { status: 'AUTHORIZED', name: updated.confirmedName, id: updated.confirmedId }
        : { status: 'UNKNOWN', name: null, id: null };
    } else {
      const updated: RecogBuffer = {
        consCount: 0,
        pendingName: null,
        pendingId: null,
        confirmedName: null,
        confirmedId: null,
        prevStatus: 'UNKNOWN'
      };
      this.recognitionBuffers.set(trackId, updated);

      if (buf.prevStatus === 'AUTHORIZED') {
        console.info(
          `[SecurityEngine] Person #${trackId}: AUTHORIZED → UNKNOWN ` +
          `(dist=${distance.toFixed(3)}, threshold=${RECOGNITION_THRESHOLD})`
        );
      }

      return { status: 'UNKNOWN', name: null, id: null };
    }
  }

  update(personDetections: PersonDetection[]): TrackedPerson[] {
    const unmatchedPersons = new Set<number>(personDetections.map((_, i) => i));
    const matchedTrackIds = new Set<number>();

    const tracksCopy = [...this.tracks];
    const assignments: { trackIdx: number; detIdx: number; d: number }[] = [];

    for (let ti = 0; ti < tracksCopy.length; ti++) {
      const t = tracksCopy[ti];
      let bestD = Infinity;
      let bestDi = -1;

      for (let di = 0; di < personDetections.length; di++) {
        if (!unmatchedPersons.has(di)) continue;
        const { cx, cy } = this.bboxCenter(personDetections[di].bbox);
        const d = this.dist(t.centerX, t.centerY, cx, cy);
        if (d < bestD) {
          bestD = d;
          bestDi = di;
        }
      }

      if (bestDi >= 0 && bestD <= MATCH_THRESHOLD) {
        assignments.push({ trackIdx: ti, detIdx: bestDi, d: bestD });
      }
    }

    assignments.sort((a, b) => a.d - b.d);

    for (const { trackIdx, detIdx } of assignments) {
      if (matchedTrackIds.has(trackIdx) || !unmatchedPersons.has(detIdx)) continue;
      matchedTrackIds.add(trackIdx);
      unmatchedPersons.delete(detIdx);

      const det = personDetections[detIdx];
      const { cx, cy } = this.bboxCenter(det.bbox);

      this.tracks[trackIdx] = {
        ...this.tracks[trackIdx],
        bbox: det.bbox,
        score: det.score,
        centerX: cx,
        centerY: cy,
        age: this.tracks[trackIdx].age + 1,
        missedFrames: 0
      };
    }

    for (let ti = 0; ti < this.tracks.length; ti++) {
      if (!matchedTrackIds.has(ti)) {
        this.tracks[ti] = {
          ...this.tracks[ti],
          missedFrames: this.tracks[ti].missedFrames + 1,
          age: this.tracks[ti].age + 1
        };
      }
    }

    this.tracks = this.tracks.filter((t) => t.missedFrames <= MAX_MISSED_FRAMES);

    // Create tracks for new unmatched person detections
    for (const di of unmatchedPersons) {
      const det = personDetections[di];
      const { cx, cy } = this.bboxCenter(det.bbox);
      const id = this.nextId++;

      this.tracks.push({
        id,
        label: `Person #${id}`,
        bbox: det.bbox,
        score: det.score,
        centerX: cx,
        centerY: cy,
        isInsideAnyZone: false,
        identityState: 'FACE_UNVERIFIED',
        matchedPersonId: null,
        matchedPersonName: null,
        associatedFaceBBox: null,
        similarityDistance: null,
        age: 1,
        missedFrames: 0
      });
    }

    return [...this.tracks];
  }
}

function makePersonTracker() {
  return new PersonTracker();
}

interface TemporalStateRecord {
  status: IntrusionStatus;
  persistenceCount: number;
  enteredAt: number | null;
  confirmedAt: string | null;
  exitCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const LiveCameras: React.FC = () => {
  const [status, setStatus] = useState<CameraStatus>('STOPPED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('IDLE');
  const [personTracks, setPersonTracks] = useState<TrackedPerson[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([]);
  const [personZoneStates, setPersonZoneStates] = useState<PersonZoneState[]>([]);
  const [aiFps, setAiFps] = useState<number | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [alarmVolume, setAlarmVolume] = useState<number>(0.92);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const personTrackerRef = useRef<PersonTracker>(makePersonTracker());
  const loopActiveRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  const temporalStatesRef = useRef<Map<string, TemporalStateRecord>>(new Map());
  const createdIncidentKeysRef = useRef<Set<string>>(new Set());

  // ─── Audio Alarm Refs ──────────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenActiveRef = useRef<boolean>(false);
  const sirenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechCooldownRef = useRef<number>(0);
  const alarmVolumeRef = useRef<number>(0.92);
  const isMutedRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => { alarmVolumeRef.current = alarmVolume; }, [alarmVolume]);
  useEffect(() => { isMutedRef.current = isAudioMuted; }, [isAudioMuted]);

  // ─── Get / create a resumed AudioContext ──────────────────────────────────
  const getAudioCtx = useCallback((): AudioContext | null => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // ─── Unlock audio on first user gesture ───────────────────────────────────
  const unlockAudio = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx) {
      setAudioUnlocked(true);
    }
  }, [getAudioCtx]);

  // ─── Play a single siren wail cycle using Web Audio API ──────────────────
  const playSirenCycle = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    const vol = alarmVolumeRef.current;
    const now = ctx.currentTime;
    const duration = 0.9;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.linearRampToValueAtTime(1760, now + duration / 2);
    osc1.frequency.linearRampToValueAtTime(880, now + duration);
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.55, now);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + duration);

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.linearRampToValueAtTime(880, now + duration / 2);
    osc2.frequency.linearRampToValueAtTime(440, now + duration);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.30, now);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now);
    osc2.stop(now + duration);

    const osc3 = ctx.createOscillator();
    osc3.type = 'square';
    osc3.frequency.setValueAtTime(1320, now);
    osc3.frequency.linearRampToValueAtTime(2200, now + duration / 2);
    osc3.frequency.linearRampToValueAtTime(1320, now + duration);
    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(0.15, now);
    gain3.gain.setValueAtTime(0.0, now + duration * 0.8);
    osc3.connect(gain3);
    gain3.connect(masterGain);
    osc3.start(now);
    osc3.stop(now + duration);
  }, [getAudioCtx]);

  // ─── Speak a voice warning via SpeechSynthesis ──────────────────────────
  const speakWarning = useCallback((zoneName: string) => {
    if (isMutedRef.current) return;
    if (!window.speechSynthesis) return;
    const now = Date.now();
    if (now - speechCooldownRef.current < 8000) return;
    speechCooldownRef.current = now;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(
      `Security alert. Unauthorized person detected in ${zoneName}. Security personnel respond immediately.`
    );
    utter.rate = 1.1;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  }, []);

  // ─── Start continuous siren loop ─────────────────────────────────────────
  const startSiren = useCallback((zoneName: string) => {
    if (sirenActiveRef.current) return;
    sirenActiveRef.current = true;
    playSirenCycle();
    speakWarning(zoneName);
    sirenIntervalRef.current = setInterval(() => {
      playSirenCycle();
    }, 1000);
  }, [playSirenCycle, speakWarning]);

  // ─── Stop siren loop ────────────────────────────────────────────────────
  const stopSiren = useCallback(() => {
    if (!sirenActiveRef.current) return;
    sirenActiveRef.current = false;
    if (sirenIntervalRef.current !== null) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  // ─── Test Alarm (user-triggered) ────────────────────────────────────────
  const testAlarm = useCallback(() => {
    unlockAudio();
    if (sirenActiveRef.current) {
      stopSiren();
      return;
    }
    playSirenCycle();
    setTimeout(() => playSirenCycle(), 1000);
    setTimeout(() => playSirenCycle(), 2000);
    if (!isMutedRef.current && window.speechSynthesis) {
      setTimeout(() => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance('Alarm test. Stadium Sentinel security system operational.');
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.volume = 1.0;
        window.speechSynthesis.speak(utter);
      }, 200);
    }
  }, [unlockAudio, stopSiren, playSirenCycle]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sirenIntervalRef.current !== null) clearInterval(sirenIntervalRef.current);
      sirenActiveRef.current = false;
      window.speechSynthesis?.cancel();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Load configured zones and authorized persons
  const loadLocalData = useCallback(() => {
    try {
      const storedZones = localStorage.getItem(ZONES_STORAGE_KEY);
      if (storedZones) setZones(JSON.parse(storedZones));
      else setZones([]);
    } catch {
      setZones([]);
    }

    try {
      const storedAuth = localStorage.getItem(AUTHORIZED_STORAGE_KEY);
      if (storedAuth) setAuthorizedPersons(JSON.parse(storedAuth));
      else setAuthorizedPersons([]);
    } catch {
      setAuthorizedPersons([]);
    }
  }, []);

  useEffect(() => {
    loadLocalData();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ZONES_STORAGE_KEY || e.key === AUTHORIZED_STORAGE_KEY) {
        loadLocalData();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', loadLocalData);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', loadLocalData);
    };
  }, [loadLocalData]);

  const playAudioBeep = useCallback((zoneName = 'restricted zone') => {
    unlockAudio();
    startSiren(zoneName);
  }, [unlockAudio, startSiren]);

  // ─── Phase 8 Composited Evidence Snapshot Capture ────────────────────────────
  const captureCompositedSnapshot = useCallback(
    (
      video: HTMLVideoElement,
      tracks: TrackedPerson[],
      allZones: RestrictedZone[],
      confirmedTrackId: number,
      confirmedZoneId: string
    ): string => {
      try {
        const srcW = video.videoWidth;
        const srcH = video.videoHeight;
        if (!srcW || !srcH) return '';

        const dispW = video.clientWidth || srcW;
        const dispH = video.clientHeight || srcH;

        const offscreen = document.createElement('canvas');
        offscreen.width = dispW;
        offscreen.height = dispH;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, dispW, dispH);

        const videoAspect = srcW / srcH;
        const canvasAspect = dispW / dispH;
        let renderW: number, renderH: number, offsetX: number, offsetY: number;
        if (videoAspect > canvasAspect) {
          renderW = dispW;
          renderH = dispW / videoAspect;
          offsetX = 0;
          offsetY = (dispH - renderH) / 2;
        } else {
          renderH = dispH;
          renderW = dispH * videoAspect;
          offsetX = (dispW - renderW) / 2;
          offsetY = 0;
        }

        const scaleX = renderW / srcW;
        const scaleY = renderH / srcH;

        ctx.drawImage(video, offsetX, offsetY, renderW, renderH);

        ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(offsetX + 2, offsetY + 2, renderW - 4, renderH - 4);
        ctx.setLineDash([]);

        const bracketSize = 12;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        [
          [offsetX + 2, offsetY + 2],
          [offsetX + renderW - 2, offsetY + 2],
          [offsetX + 2, offsetY + renderH - 2],
          [offsetX + renderW - 2, offsetY + renderH - 2],
        ].forEach(([bx, by], i) => {
          const sx = i % 2 === 0 ? 1 : -1;
          const sy = i < 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(bx, by + sy * bracketSize);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + sx * bracketSize, by);
          ctx.stroke();
        });

        allZones.forEach((zone) => {
          if (!zone.points || zone.points.length < 3) return;
          const isBreached = zone.id === confirmedZoneId;

          const getSevColor = (sev: typeof zone.severity) => {
            switch (sev) {
              case 'Critical': return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.16)' };
              case 'High': return { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.16)' };
              case 'Medium': return { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.16)' };
              case 'Low': return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.14)' };
              default: return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.16)' };
            }
          };
          const sevStyle = getSevColor(zone.severity);

          ctx.beginPath();
          const startX = offsetX + zone.points[0].x * renderW;
          const startY = offsetY + zone.points[0].y * renderH;
          ctx.moveTo(startX, startY);
          for (let i = 1; i < zone.points.length; i++) {
            ctx.lineTo(offsetX + zone.points[i].x * renderW, offsetY + zone.points[i].y * renderH);
          }
          ctx.closePath();

          ctx.fillStyle = isBreached ? 'rgba(239, 68, 68, 0.32)' : sevStyle.fill;
          ctx.strokeStyle = isBreached ? '#ef4444' : sevStyle.stroke;
          ctx.lineWidth = isBreached ? 3 : 1.5;
          ctx.fill();
          ctx.stroke();

          zone.points.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(offsetX + pt.x * renderW, offsetY + pt.y * renderH, 4, 0, 2 * Math.PI);
            ctx.fillStyle = isBreached ? '#ef4444' : sevStyle.stroke;
            ctx.fill();
          });

          const avgX = offsetX + (zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length) * renderW;
          const avgY = offsetY + (zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length) * renderH;
          const badgeText = isBreached
            ? `🚨 CONFIRMED INTRUSION — (${zone.name.toUpperCase()})`
            : `${zone.name.toUpperCase()} (${zone.severity.toUpperCase()})`;

          ctx.font = 'bold 11px monospace';
          const badgeWidth = ctx.measureText(badgeText).width + 18;
          ctx.fillStyle = isBreached ? 'rgba(153, 27, 27, 0.95)' : 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(avgX - badgeWidth / 2, avgY - 12, badgeWidth, 24);
          ctx.strokeStyle = isBreached ? '#ef4444' : sevStyle.stroke;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(avgX - badgeWidth / 2, avgY - 12, badgeWidth, 24);
          ctx.fillStyle = isBreached ? '#ffffff' : '#94a3b8';
          ctx.textAlign = 'center';
          ctx.fillText(badgeText, avgX, avgY + 4);
          ctx.textAlign = 'left';
        });

        const visibleTracks = tracks.filter((t) => t.missedFrames === 0 && t.isInsideAnyZone);
        visibleTracks.forEach((track) => {
          const isIntruder = track.id === confirmedTrackId;
          const [bx, by, bw, bh] = track.bbox;
          const dx = offsetX + bx * scaleX;
          const dy = offsetY + by * scaleY;
          const dw = bw * scaleX;
          const dh = bh * scaleY;
          const confidence = (track.score * 100).toFixed(1);

          let boxColor = '#10b981';
          let strokeColor = '#34d399';
          let fillColor = 'rgba(16, 185, 129, 0.07)';
          let statusTag = track.identityState === 'AUTHORIZED'
            ? `✓ AUTHORIZED — ${track.matchedPersonName}`
            : track.identityState === 'FACE_UNVERIFIED'
            ? `⚠ FACE UNVERIFIED`
            : `⚠ UNKNOWN`;
          let badgeBg = track.identityState === 'AUTHORIZED'
            ? 'rgba(16, 185, 129, 0.95)'
            : track.identityState === 'FACE_UNVERIFIED'
            ? 'rgba(217, 119, 6, 0.95)'
            : 'rgba(71, 85, 105, 0.95)';
          let badgeTextColor = '#ffffff';

          if (isIntruder) {
            const zName = allZones.find((z) => z.id === confirmedZoneId)?.name || 'RESTRICTED ZONE';
            boxColor = '#ef4444';
            strokeColor = '#f87171';
            fillColor = 'rgba(239, 68, 68, 0.20)';
            const labelTag = track.identityState === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : 'UNKNOWN';
            statusTag = `🚨 CONFIRMED INTRUSION — ${labelTag} (${zName.toUpperCase()})`;
            badgeBg = 'rgba(220, 38, 38, 0.98)';
            badgeTextColor = '#ffffff';
          }

          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(dx, dy, dw, dh);
          ctx.fillStyle = fillColor;
          ctx.fillRect(dx, dy, dw, dh);

          if (track.associatedFaceBBox) {
            const [fx, fy, fw, fh] = track.associatedFaceBBox;
            const fdx = offsetX + fx * scaleX;
            const fdy = offsetY + fy * scaleY;
            const fdw = fw * scaleX;
            const fdh = fh * scaleY;
            ctx.strokeStyle = track.identityState === 'AUTHORIZED' ? '#34d399' : '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(fdx, fdy, fdw, fdh);
            ctx.setLineDash([]);
          }

          const ca = 10;
          const corners: [number, number, number, number][] = [
            [dx, dy, ca, ca],
            [dx + dw, dy, -ca, ca],
            [dx, dy + dh, ca, -ca],
            [dx + dw, dy + dh, -ca, -ca],
          ];
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          corners.forEach(([cx2, cy2, hx, vy]) => {
            ctx.beginPath();
            ctx.moveTo(cx2 + hx, cy2);
            ctx.lineTo(cx2, cy2);
            ctx.lineTo(cx2, cy2 + vy);
            ctx.stroke();
          });

          const label = `${track.label}  ${confidence}%  ${statusTag}`;
          ctx.font = 'bold 11px monospace';
          const textW = ctx.measureText(label).width + 10;
          const labelY = dy > 22 ? dy - 1 : dy + dh + 18;

          ctx.fillStyle = badgeBg;
          ctx.fillRect(dx, labelY - 15, textW, 18);
          ctx.fillStyle = badgeTextColor;
          ctx.fillText(label, dx + 5, labelY);

          const centPixX = offsetX + track.centerX * renderW;
          const centPixY = offsetY + track.centerY * renderH;

          ctx.beginPath();
          ctx.arc(centPixX, centPixY, 8, 0, 2 * Math.PI);
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(centPixX, centPixY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = isIntruder ? '#ef4444' : '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(offsetX, offsetY, renderW, 26);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('STADIUMSENTINEL EVIDENCE CAPTURE — CONFIRMED INTRUSION', offsetX + 10, offsetY + 17);
        ctx.fillStyle = '#94a3b8';
        const dateTag = new Date().toISOString();
        ctx.textAlign = 'right';
        ctx.fillText(dateTag, offsetX + renderW - 10, offsetY + 17);
        ctx.textAlign = 'left';

        return offscreen.toDataURL('image/jpeg', 0.90);
      } catch (err) {
        console.warn('Failed to capture composited snapshot:', err);
        return '';
      }
    },
    []
  );

  // ─── Canvas render (Zone-First: Only draw overlays for In-Zone Persons) ─────
  const renderCanvas = useCallback(
    (currentPersons: TrackedPerson[], currentZones: RestrictedZone[], currentStates: PersonZoneState[]) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const dispW = video.clientWidth;
      const dispH = video.clientHeight;
      if (dispW === 0 || dispH === 0) return;

      if (canvas.width !== dispW || canvas.height !== dispH) {
        canvas.width = dispW;
        canvas.height = dispH;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, dispW, dispH);

      const srcW = video.videoWidth || dispW;
      const srcH = video.videoHeight || dispH;
      const videoAspect = srcW / srcH;
      const canvasAspect = dispW / dispH;

      let renderW: number, renderH: number, offsetX: number, offsetY: number;
      if (videoAspect > canvasAspect) {
        renderW = dispW;
        renderH = dispW / videoAspect;
        offsetX = 0;
        offsetY = (dispH - renderH) / 2;
      } else {
        renderH = dispH;
        renderW = dispH * videoAspect;
        offsetX = (dispW - renderW) / 2;
        offsetY = 0;
      }

      const scaleX = renderW / srcW;
      const scaleY = renderH / srcH;

      // 1. Camera Frame Brackets
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(offsetX + 2, offsetY + 2, renderW - 4, renderH - 4);
      ctx.setLineDash([]);

      const bracketSize = 12;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      [
        [offsetX + 2, offsetY + 2],
        [offsetX + renderW - 2, offsetY + 2],
        [offsetX + 2, offsetY + renderH - 2],
        [offsetX + renderW - 2, offsetY + renderH - 2],
      ].forEach(([bx, by], i) => {
        const sx = i % 2 === 0 ? 1 : -1;
        const sy = i < 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(bx, by + sy * bracketSize);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + sx * bracketSize, by);
        ctx.stroke();
      });

      // 2. Polygon Zones Overlay
      currentZones.forEach((zone) => {
        if (!zone.points || zone.points.length < 3) return;

        const zoneStates = currentStates.filter((s) => s.zoneId === zone.id);
        const confirmedIntrusions = zoneStates.filter(
          (s) => (s.status === 'CONFIRMED_INTRUSION' || s.status === 'PENDING_EXIT') && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED')
        );
        const pendingUnknowns = zoneStates.filter(
          (s) => s.status === 'PENDING_ENTRY' && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED')
        );
        const authorizedInside = zoneStates.filter(
          (s) => s.isRawInside && s.identityState === 'AUTHORIZED'
        );

        const hasIntrusion = confirmedIntrusions.length > 0;
        const hasPending = pendingUnknowns.length > 0;
        const hasAuthorized = authorizedInside.length > 0;

        ctx.beginPath();
        const startX = offsetX + zone.points[0].x * renderW;
        const startY = offsetY + zone.points[0].y * renderH;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < zone.points.length; i++) {
          const px = offsetX + zone.points[i].x * renderW;
          const py = offsetY + zone.points[i].y * renderH;
          ctx.lineTo(px, py);
        }
        ctx.closePath();

        if (hasIntrusion) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.32)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
        } else if (hasPending) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
        } else if (hasAuthorized) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
        }

        ctx.fill();
        ctx.stroke();

        zone.points.forEach((pt) => {
          const vx = offsetX + pt.x * renderW;
          const vy = offsetY + pt.y * renderH;
          ctx.beginPath();
          ctx.arc(vx, vy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = hasIntrusion ? '#ef4444' : hasPending ? '#f59e0b' : hasAuthorized ? '#10b981' : '#60a5fa';
          ctx.fill();
        });

        // Zone Badge in Center
        const avgX = offsetX + (zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length) * renderW;
        const avgY = offsetY + (zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length) * renderH;

        let badgeText = `${zone.name.toUpperCase()} (RESTRICTED)`;
        let bgStyle = 'rgba(15, 23, 42, 0.88)';
        let strokeStyle = '#3b82f6';
        let textStyle = '#94a3b8';

        if (hasIntrusion) {
          const intruderState = confirmedIntrusions[0];
          const labelTag = intruderState.identityState === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : 'UNKNOWN';
          badgeText = `🚨 CONFIRMED INTRUSION — ${labelTag} (${zone.name.toUpperCase()})`;
          bgStyle = 'rgba(153, 27, 27, 0.95)';
          strokeStyle = '#ef4444';
          textStyle = '#ffffff';
        } else if (hasPending) {
          const p = pendingUnknowns[0];
          const dwellSec = (p.dwellTimeMs / 1000).toFixed(1);
          const reqDwellSec = (p.requiredDwellMs / 1000).toFixed(1);
          const labelTag = p.identityState === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : 'UNKNOWN';
          badgeText = `⏳ VERIFYING ${labelTag} (${p.persistenceCount}/${p.requiredPersistence}f, ${dwellSec}s/${reqDwellSec}s)`;
          bgStyle = 'rgba(146, 64, 14, 0.92)';
          strokeStyle = '#f59e0b';
          textStyle = '#fef3c7';
        } else if (hasAuthorized) {
          const name = authorizedInside[0].matchedPersonName || 'Player';
          badgeText = `✓ AUTHORIZED — ${name.toUpperCase()} (NO INTRUSION)`;
          bgStyle = 'rgba(6, 78, 59, 0.92)';
          strokeStyle = '#10b981';
          textStyle = '#a7f3d0';
        }

        ctx.font = 'bold 11px monospace';
        const badgeWidth = ctx.measureText(badgeText).width + 18;
        ctx.fillStyle = bgStyle;
        ctx.fillRect(avgX - badgeWidth / 2, avgY - 12, badgeWidth, 24);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(avgX - badgeWidth / 2, avgY - 12, badgeWidth, 24);

        ctx.fillStyle = textStyle;
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, avgX, avgY + 4);
        ctx.textAlign = 'left';
      });

      // 3. Zone-First Overlays: ONLY render security BBoxes for persons INSIDE restricted zones!
      const inZonePersons = currentPersons.filter((t) => t.missedFrames === 0 && t.isInsideAnyZone);

      inZonePersons.forEach((person) => {
        const [bx, by, bw, bh] = person.bbox;
        const dx = offsetX + bx * scaleX;
        const dy = offsetY + by * scaleY;
        const dw = bw * scaleX;
        const dh = bh * scaleY;
        const confidence = (person.score * 100).toFixed(1);

        const personStates = currentStates.filter((s) => s.personId === person.id);
        const confirmedState = personStates.find(
          (s) => (s.status === 'CONFIRMED_INTRUSION' || s.status === 'PENDING_EXIT') && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED')
        );
        const pendingState = personStates.find((s) => s.status === 'PENDING_ENTRY' && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED'));
        const authorizedState = personStates.find((s) => s.isRawInside && s.identityState === 'AUTHORIZED');

        let boxColor = '#10b981';
        let strokeColor = '#34d399';
        let fillColor = 'rgba(16, 185, 129, 0.07)';
        let statusTag = person.identityState === 'AUTHORIZED'
          ? `✓ AUTHORIZED — ${person.matchedPersonName}`
          : person.identityState === 'FACE_UNVERIFIED'
          ? `⚠ FACE UNVERIFIED`
          : `⚠ UNKNOWN`;
        let badgeBg = person.identityState === 'AUTHORIZED'
          ? 'rgba(16, 185, 129, 0.95)'
          : person.identityState === 'FACE_UNVERIFIED'
          ? 'rgba(217, 119, 6, 0.95)'
          : 'rgba(71, 85, 105, 0.95)';
        let badgeTextColor = '#ffffff';

        if (confirmedState) {
          boxColor = '#ef4444';
          strokeColor = '#f87171';
          fillColor = 'rgba(239, 68, 68, 0.20)';
          const labelTag = person.identityState === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : 'UNKNOWN';
          statusTag = `🚨 CONFIRMED INTRUSION — ${labelTag} (${confirmedState.zoneName.toUpperCase()})`;
          badgeBg = 'rgba(220, 38, 38, 0.98)';
          badgeTextColor = '#ffffff';
        } else if (pendingState) {
          boxColor = '#f59e0b';
          strokeColor = '#fbbf24';
          fillColor = 'rgba(245, 158, 11, 0.14)';
          const dwellSec = (pendingState.dwellTimeMs / 1000).toFixed(1);
          const labelTag = person.identityState === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : 'UNKNOWN';
          statusTag = `⏳ VERIFYING ${labelTag} (${pendingState.persistenceCount}/${pendingState.requiredPersistence}f, ${dwellSec}s)`;
          badgeBg = 'rgba(217, 119, 6, 0.95)';
          badgeTextColor = '#ffffff';
        } else if (authorizedState) {
          boxColor = '#10b981';
          strokeColor = '#34d399';
          fillColor = 'rgba(16, 185, 129, 0.15)';
          statusTag = `✓ AUTHORIZED — ${person.matchedPersonName} (NO INTRUSION)`;
          badgeBg = 'rgba(5, 150, 105, 0.95)';
          badgeTextColor = '#ffffff';
        }

        // Draw Person Bounding Box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(dx, dy, dw, dh);
        ctx.fillStyle = fillColor;
        ctx.fillRect(dx, dy, dw, dh);

        // Draw Associated Face Box inside Person Box
        if (person.associatedFaceBBox) {
          const [fx, fy, fw, fh] = person.associatedFaceBBox;
          const fdx = offsetX + fx * scaleX;
          const fdy = offsetY + fy * scaleY;
          const fdw = fw * scaleX;
          const fdh = fh * scaleY;

          ctx.strokeStyle = person.identityState === 'AUTHORIZED' ? '#34d399' : '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(fdx, fdy, fdw, fdh);
          ctx.setLineDash([]);
        }

        const ca = 10;
        const corners: [number, number, number, number][] = [
          [dx, dy, ca, ca],
          [dx + dw, dy, -ca, ca],
          [dx, dy + dh, ca, -ca],
          [dx + dw, dy + dh, -ca, -ca],
        ];
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        corners.forEach(([cx2, cy2, hx, vy]) => {
          ctx.beginPath();
          ctx.moveTo(cx2 + hx, cy2);
          ctx.lineTo(cx2, cy2);
          ctx.lineTo(cx2, cy2 + vy);
          ctx.stroke();
        });

        const label = `${person.label}  ${confidence}%  ${statusTag}`;
        ctx.font = 'bold 11px monospace';
        const textW = ctx.measureText(label).width + 10;
        const labelY = dy > 22 ? dy - 1 : dy + dh + 18;

        ctx.fillStyle = badgeBg;
        ctx.fillRect(dx, labelY - 15, textW, 18);
        ctx.fillStyle = badgeTextColor;
        ctx.fillText(label, dx + 5, labelY);

        // Person Centroid
        const centPixX = offsetX + person.centerX * renderW;
        const centPixY = offsetY + person.centerY * renderH;

        ctx.beginPath();
        ctx.arc(centPixX, centPixY, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centPixX, centPixY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = confirmedState ? '#ef4444' : pendingState ? '#f59e0b' : '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    },
    []
  );

  const pendingIntrusionsRef = useRef<Array<{
    incidentKey: string;
    confirmedAt: string;
    track: TrackedPerson;
    zone: RestrictedZone;
  }>>([]);

  // ─── Core Security Engine & Zone Evaluator ─────────────────────────────────
  const evaluateSecurityDecisions = useCallback(
    (currentPersons: TrackedPerson[], currentZones: RestrictedZone[]): PersonZoneState[] => {
      // Zone-First: Only evaluate security decisions for persons INSIDE a restricted zone
      const inZonePersons = currentPersons.filter((p) => p.missedFrames === 0 && p.isInsideAnyZone);
      const newStates: PersonZoneState[] = [];
      const activeKeys = new Set<string>();
      const now = Date.now();

      inZonePersons.forEach((p) => {
        const point = { x: p.centerX, y: p.centerY };

        currentZones.forEach((z) => {
          const isRawInside = isPointInPolygon(point, z.points);
          if (!isRawInside) return;

          const key = `${p.id}_${z.id}`;
          activeKeys.add(key);

          const minConf = z.minConfidence ?? DEFAULT_ZONE_MIN_CONFIDENCE;
          const reqPersist = z.persistenceFrames ?? DEFAULT_PERSISTENCE_FRAMES;
          const reqDwellMs = (z.minDwellSeconds ?? DEFAULT_MIN_DWELL_SECONDS) * 1000;
          const validConfidence = p.score >= minConf;

          const prev = temporalStatesRef.current.get(key);
          let record: TemporalStateRecord;

          // ── CORE SECURITY RULES ──
          // AUTHORIZED + INSIDE ZONE → NO INTRUSION
          if (p.identityState === 'AUTHORIZED') {
            record = {
              status: 'OUTSIDE',
              persistenceCount: 0,
              enteredAt: null,
              confirmedAt: null,
              exitCount: 0
            };
          } else if (validConfidence) {
            // UNKNOWN or FACE_UNVERIFIED + INSIDE ZONE → persistence + dwell → CONFIRMED INTRUSION
            const newExitCount = 0;
            const newPersistenceCount = (prev?.persistenceCount ?? 0) + 1;
            const enteredAt = prev?.enteredAt ?? now;
            const dwellTimeMs = now - enteredAt;

            let newStatus: IntrusionStatus = 'PENDING_ENTRY';
            let confirmedAt: string | null = prev?.confirmedAt ?? null;

            if (prev?.status === 'CONFIRMED_INTRUSION') {
              newStatus = 'CONFIRMED_INTRUSION';
            } else if (newPersistenceCount >= reqPersist && dwellTimeMs >= reqDwellMs) {
              newStatus = 'CONFIRMED_INTRUSION';
              confirmedAt = new Date().toISOString();

              const incidentKey = `${key}_${confirmedAt}`;
              if (!createdIncidentKeysRef.current.has(incidentKey)) {
                createdIncidentKeysRef.current.add(incidentKey);
                pendingIntrusionsRef.current.push({
                  incidentKey,
                  confirmedAt,
                  track: p,
                  zone: z
                });
                playAudioBeep(z.name);
              }
            } else {
              newStatus = 'PENDING_ENTRY';
            }

            record = {
              status: newStatus,
              persistenceCount: newPersistenceCount,
              enteredAt,
              confirmedAt,
              exitCount: newExitCount
            };
          } else {
            record = {
              status: 'OUTSIDE',
              persistenceCount: 0,
              enteredAt: null,
              confirmedAt: null,
              exitCount: 0
            };
          }

          temporalStatesRef.current.set(key, record);

          const currentDwellMs = record.enteredAt ? now - record.enteredAt : 0;

          newStates.push({
            personId: p.id,
            personLabel: p.label,
            identityState: p.identityState,
            matchedPersonName: p.matchedPersonName || null,
            zoneId: z.id,
            zoneName: z.name,
            zoneSeverity: z.severity,
            isRawInside: true,
            validConfidence,
            status: record.status,
            persistenceCount: record.persistenceCount,
            requiredPersistence: reqPersist,
            enteredAt: record.enteredAt,
            dwellTimeMs: currentDwellMs,
            requiredDwellMs: reqDwellMs,
            confirmedAt: record.confirmedAt,
            exitCount: record.exitCount,
            updatedAt: now,
            // Backwards compatibility
            faceId: p.id,
            faceLabel: p.label,
            recognitionStatus: p.identityState === 'AUTHORIZED' ? 'AUTHORIZED' : 'UNKNOWN'
          });
        });
      });

      for (const key of temporalStatesRef.current.keys()) {
        if (!activeKeys.has(key)) {
          temporalStatesRef.current.delete(key);
          for (const incKey of createdIncidentKeysRef.current.keys()) {
            if (incKey.startsWith(`${key}_`)) {
              createdIncidentKeysRef.current.delete(incKey);
            }
          }
        }
      }

      return newStates;
    },
    [playAudioBeep]
  );

  // ─── Zone-First Security Detection Loop ─────────────────────────────────────
  const runDetectionLoop = useCallback(async () => {
    const video = videoRef.current;

    if (!loopActiveRef.current || !video) return;
    if (video.readyState < 2 || video.videoWidth === 0) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const t0 = performance.now();

    try {
      // Step 1: Detect persons across full camera frame
      const personDetections = await detectPersons(video, 0.35);

      if (!loopActiveRef.current) return;

      // Step 2: Track persons across frame
      personTrackerRef.current.setVideoDimensions(video.videoWidth, video.videoHeight);
      const updatedPersons = personTrackerRef.current.update(personDetections);

      // Step 3: Zone-First evaluation — check which person centroids are inside restricted zones
      for (const person of updatedPersons) {
        const point = { x: person.centerX, y: person.centerY };
        const isInside = zones.some((z) => isPointInPolygon(point, z.points));
        person.isInsideAnyZone = isInside;

        if (isInside) {
          // Perform targeted face recognition ONLY for inside person on their cropped BBox
          const faceResult = await detectFaceInPersonCrop(video, person.bbox);

          if (faceResult) {
            const matchResult = matchFaceDescriptor(faceResult.descriptor, authorizedPersons, RECOGNITION_THRESHOLD);
            const rawStatus = matchResult.isAuthorized ? ('AUTHORIZED' as const) : ('UNKNOWN' as const);

            const voted = personTrackerRef.current.applyRecognitionVote(
              person.id,
              rawStatus,
              matchResult.person?.name || null,
              matchResult.person?.id || null,
              matchResult.distance
            );

            person.identityState = voted.status;
            person.matchedPersonId = voted.id;
            person.matchedPersonName = voted.name;
            person.associatedFaceBBox = faceResult.bbox;
            person.similarityDistance = matchResult.distance === Infinity ? null : matchResult.distance;
          } else {
            // Inside person detected but no face recognized (masked / occluded / turned away)
            personTrackerRef.current.applyRecognitionVote(person.id, 'UNKNOWN', null, null, Infinity);
            person.identityState = 'FACE_UNVERIFIED';
            person.matchedPersonId = null;
            person.matchedPersonName = null;
            person.associatedFaceBBox = null;
            person.similarityDistance = null;
          }
        } else {
          // Outside person: ZERO face recognition processing! Reset face security state.
          personTrackerRef.current.applyRecognitionVote(person.id, 'UNKNOWN', null, null, Infinity);
          person.identityState = 'FACE_UNVERIFIED';
          person.matchedPersonId = null;
          person.matchedPersonName = null;
          person.associatedFaceBBox = null;
          person.similarityDistance = null;
        }
      }

      // Step 4: Evaluate intrusion decisions only for in-zone persons
      const updatedSecurityStates = evaluateSecurityDecisions(updatedPersons, zones);

      setPersonTracks(updatedPersons);
      setPersonZoneStates(updatedSecurityStates);
      renderCanvas(updatedPersons, zones, updatedSecurityStates);

      // Step 5: Process evidence capture on confirmed intrusion
      if (pendingIntrusionsRef.current.length > 0) {
        const queue = [...pendingIntrusionsRef.current];
        pendingIntrusionsRef.current = [];

        queue.forEach((item) => {
          const snapshotUrl = captureCompositedSnapshot(
            video,
            updatedPersons,
            zones,
            item.track.id,
            item.zone.id
          );

          const nowObj = new Date(item.confirmedAt);
          const timeStr = nowObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = nowObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const displayTime = `${timeStr} • ${dateStr}`;

          const newIncident: SecurityIncident = {
            id: `INC-${Date.now().toString().slice(-6)}`,
            timestamp: item.confirmedAt,
            displayTime,
            cameraName: 'CAM-01 — Laptop Camera',
            faceTrackId: item.track.id,
            faceLabel: item.track.label,
            identityStatus: item.track.identityState === 'AUTHORIZED' ? 'AUTHORIZED' : 'UNKNOWN',
            matchedPersonName: item.track.matchedPersonName || null,
            zoneId: item.zone.id,
            zoneName: item.zone.name,
            zoneType: item.zone.type,
            zoneSeverity: item.zone.severity,
            confidence: item.track.score,
            centroid: { x: item.track.centerX, y: item.track.centerY },
            status: 'UNACKNOWLEDGED',
            snapshotUrl,
            createdAt: item.confirmedAt
          };

          saveIncident(newIncident);
          saveIncidentToFirestore(newIncident);
        });
      }

      const elapsed = performance.now() - t0;
      setAiFps(elapsed > 0 ? Math.round(1000 / elapsed) : null);
    } catch {
      // silent per-frame handler
    }

    if (loopActiveRef.current) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [evaluateSecurityDecisions, zones, authorizedPersons, renderCanvas, captureCompositedSnapshot]);

  const loadModels = useCallback(async () => {
    setModelStatus('LOADING');
    try {
      await loadFaceApiModels();
      setModelStatus('READY');
    } catch {
      setModelStatus('ERROR');
    }
  }, []);

  useEffect(() => {
    if (status === 'READY' && modelStatus === 'READY') {
      if (loopActiveRef.current) return;
      loopActiveRef.current = true;
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    } else {
      loopActiveRef.current = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (status !== 'READY') {
        setPersonTracks([]);
        setPersonZoneStates([]);
        temporalStatesRef.current.clear();
        createdIncidentKeysRef.current.clear();
        setAiFps(null);
        renderCanvas([], zones, []);
      }
    }
  }, [status, modelStatus, runDetectionLoop, renderCanvas, zones]);

  const stopCamera = useCallback(() => {
    loopActiveRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    personTrackerRef.current.reset();
    temporalStatesRef.current.clear();
    createdIncidentKeysRef.current.clear();
    setStatus('STOPPED');
    setErrorMessage(null);
    setVideoDimensions(null);
    setPersonTracks([]);
    setPersonZoneStates([]);
    setAiFps(null);
  }, []);

  const startCamera = async () => {
    stopCamera();
    setStatus('REQUESTING');
    setErrorMessage(null);
    loadModels();
    loadLocalData();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API is not supported in your browser.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStatus('READY');
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('DENIED');
        setErrorMessage('Camera access denied. Please grant permission in your browser.');
      } else {
        setStatus('ERROR');
        setErrorMessage(error.message || 'Unable to initialize webcam stream.');
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const obs = new ResizeObserver(() => renderCanvas(personTracks, zones, personZoneStates));
    obs.observe(video);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [personTracks, zones, personZoneStates, renderCanvas]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const activePersons = personTracks.filter((t) => t.missedFrames === 0);
  const inZoneActivePersons = activePersons.filter((t) => t.isInsideAnyZone);
  const confirmedUnknownIntrusions = personZoneStates.filter(
    (s) => (s.status === 'CONFIRMED_INTRUSION' || s.status === 'PENDING_EXIT') && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED')
  );
  const pendingUnknowns = personZoneStates.filter(
    (s) => s.status === 'PENDING_ENTRY' && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED')
  );
  const activeAuthorized = inZoneActivePersons.filter((t) => t.identityState === 'AUTHORIZED');

  const isAlarmActive = confirmedUnknownIntrusions.length > 0;

  useEffect(() => {
    if (isAlarmActive) {
      const zoneName = confirmedUnknownIntrusions[0]?.zoneName || 'restricted zone';
      startSiren(zoneName);
    } else {
      stopSiren();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlarmActive]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">STADIUM MONITORING — LIVE SURVEILLANCE CONSOLE</h2>
          <p className="text-xs text-slate-400 mt-1">
            Zone-First Security Engine • Targeted Face Processing for In-Zone Persons
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">

          {/* Volume slider */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={alarmVolume}
              onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer"
              title={`Alarm volume: ${Math.round(alarmVolume * 100)}%`}
            />
            <span className="text-[10px] text-slate-400 font-mono w-7 text-right">{Math.round(alarmVolume * 100)}%</span>
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => {
              unlockAudio();
              setIsAudioMuted((m) => !m);
              if (!isAudioMuted) stopSiren();
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
              isAudioMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-blue-950 text-blue-300 border-blue-800'
            }`}
            title={isAudioMuted ? 'Unmute Audio Alarm' : 'Mute Audio Alarm'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            <span>{isAudioMuted ? 'MUTED' : 'AUDIO ON'}</span>
          </button>

          {/* Test Alarm button */}
          <button
            onClick={testAlarm}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
              !audioUnlocked
                ? 'bg-amber-950/50 text-amber-300 border-amber-700 animate-pulse'
                : 'bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900/60'
            }`}
            title="Test alarm sound — click first to unlock browser audio"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{audioUnlocked ? 'TEST ALARM' : 'UNLOCK + TEST'}</span>
          </button>

          {status !== 'READY' && status !== 'REQUESTING' ? (
            <button
              onClick={() => { unlockAudio(); startCamera(); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-900/30 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>START CAMERA</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              disabled={status === 'REQUESTING'}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition-all disabled:opacity-50"
            >
              <VideoOff className="w-4 h-4 text-rose-400" />
              <span>STOP CAMERA</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Camera Feed + Canvas Overlay */}
        <div
          className={`lg:col-span-3 bg-[#121722] border rounded-xl p-4 flex flex-col min-h-[440px] transition-all ${
            isAlarmActive ? 'border-rose-500 shadow-xl shadow-rose-950/30' : 'border-[#1f293d]'
          }`}
        >
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1f293d] text-xs font-mono">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              <span className="text-slate-200 font-semibold">CAM-01</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Laptop Webcam</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isAlarmActive && (
                <span className="flex items-center gap-1.5 text-white bg-rose-600 px-2.5 py-0.5 rounded font-bold animate-pulse shadow-md">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  🚨 ALARM ACTIVE
                </span>
              )}
              {status === 'READY' && (
                <span className="flex items-center gap-1.5 text-emerald-400 px-2 py-0.5 bg-emerald-950/60 rounded border border-emerald-800/60 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />LIVE
                </span>
              )}
              {status === 'REQUESTING' && (
                <span className="flex items-center gap-1.5 text-amber-400 px-2 py-0.5 bg-amber-950/60 rounded border border-amber-800/60">
                  <RefreshCw className="w-3 h-3 animate-spin" />REQUESTING
                </span>
              )}
              {status === 'STOPPED' && (
                <span className="text-slate-500 px-2 py-0.5 bg-[#0a0d14] rounded border border-[#1f293d]">
                  STOPPED
                </span>
              )}
              {modelStatus === 'LOADING' && (
                <span className="flex items-center gap-1.5 text-amber-400 px-2 py-0.5 bg-amber-950/60 rounded border border-amber-800/60">
                  <RefreshCw className="w-3 h-3 animate-spin" />AI LOADING
                </span>
              )}
              {modelStatus === 'READY' && status === 'READY' && (
                <span className="flex items-center gap-1.5 text-purple-400 px-2 py-0.5 bg-purple-950/60 rounded border border-purple-800/60 font-semibold">
                  <Cpu className="w-3 h-3" />ZONE-FIRST SECURITY ENGINE
                </span>
              )}
            </div>
          </div>

          {/* Video + Canvas Workspace */}
          <div
            ref={containerRef}
            className="relative w-full flex-1 flex items-center justify-center bg-[#0a0d14] rounded-lg overflow-hidden border border-[#1f293d] min-h-[360px] select-none"
          >
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              autoPlay playsInline muted
              className={`w-full h-auto max-h-[500px] object-contain ${status === 'READY' ? 'block' : 'hidden'}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute top-0 left-0 pointer-events-none ${status === 'READY' ? 'block' : 'hidden'}`}
            />

            {/* Visual Siren Alarm Overlay Banner */}
            {isAlarmActive && (
              <div className="absolute top-3 left-3 right-3 bg-rose-950/90 border-2 border-rose-500 p-3 rounded-lg text-white shadow-2xl flex items-center justify-between z-20 backdrop-blur-md animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 rounded-full text-white">
                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-wide text-rose-200">
                      🚨 INTRUSION DETECTED — {confirmedUnknownIntrusions[0].identityState === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED PERSON' : 'UNKNOWN PERSON'}
                    </div>
                    <div className="text-xs text-rose-100 font-mono">
                      Zone: <span className="font-bold text-white">{confirmedUnknownIntrusions[0].zoneName}</span> ({confirmedUnknownIntrusions[0].zoneSeverity.toUpperCase()} SEVERITY)
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-rose-200">
                  <div>EVIDENCE CAPTURED</div>
                  <div className="text-[10px] text-rose-300">INCIDENT RECORDED</div>
                </div>
              </div>
            )}

            {status === 'STOPPED' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-[#121722] rounded-full border border-[#1f293d] mb-3">
                  <Camera className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-300">Camera Feed Stopped</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Start the camera to activate Zone-First Security Detection and targeted in-zone face processing.
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  START CAMERA
                </button>
              </div>
            )}
            {status === 'REQUESTING' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                <h3 className="text-base font-semibold text-slate-200">Requesting Camera Permission</h3>
                <p className="text-xs text-slate-400 mt-1">Please allow webcam access when prompted.</p>
              </div>
            )}
            {status === 'DENIED' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <ShieldAlert className="w-10 h-10 text-rose-500 mb-3" />
                <h3 className="text-base font-semibold text-rose-400">Camera Access Denied</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{errorMessage}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
                >
                  Retry Request
                </button>
              </div>
            )}
            {status === 'ERROR' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                <h3 className="text-base font-semibold text-rose-400">Webcam Stream Error</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-3 border-t border-[#1f293d]">
            <div className="flex flex-wrap items-center gap-4">
              <span>VIDEO: {status === 'READY' ? 'ACTIVE' : 'INACTIVE'}</span>
              <span>RES: {videoDimensions ? `${videoDimensions.width}×${videoDimensions.height}` : '--'}</span>
              <span>PEOPLE DETECTED: {status === 'READY' ? activePersons.length : 0}</span>
              <span className="text-amber-400 font-semibold">IN-ZONE: {inZoneActivePersons.length}</span>
              <span className="text-emerald-400 font-semibold">AUTHORIZED: {activeAuthorized.length}</span>
              <span className="text-rose-400 font-bold">INTRUSIONS: {confirmedUnknownIntrusions.length}</span>
            </div>
            <span>AI FPS: {aiFps !== null ? aiFps : '--'}</span>
          </div>
        </div>

        {/* Right Intelligence Panel */}
        <div className="flex flex-col gap-4">

          {/* Active Zone Policies */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d] mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-slate-200">Active Zone Policies</h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold">{zones.length} LOADED</span>
            </div>

            {zones.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                No zones loaded. Create polygon zones in Zone Calibration page.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {zones.map((z) => {
                  const confCount = confirmedUnknownIntrusions.filter((s) => s.zoneId === z.id).length;
                  const pendCount = pendingUnknowns.filter((s) => s.zoneId === z.id).length;
                  const authCount = personZoneStates.filter(
                    (s) => s.zoneId === z.id && s.isRawInside && s.identityState === 'AUTHORIZED'
                  ).length;

                  return (
                    <div
                      key={z.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        confCount > 0
                          ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                          : pendCount > 0
                          ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                          : authCount > 0
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                          : 'bg-[#0a0d14] border-[#1f293d] text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{z.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({z.severity})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {z.points.length} vertices • {z.minDwellSeconds ?? DEFAULT_MIN_DWELL_SECONDS}s dwell
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        {confCount > 0 ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold animate-pulse">
                            INTRUSION ({confCount})
                          </span>
                        ) : pendCount > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
                            VERIFYING ({pendCount})
                          </span>
                        ) : authCount > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                            AUTHORIZED ({authCount})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">CLEAR</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Zone-First Security Processing Panel */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-4 flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d] mb-3">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Targeted In-Zone Security
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                {status === 'READY' && modelStatus === 'READY' ? `${inZoneActivePersons.length} IN-ZONE` : '--'}
              </span>
            </div>

            {status !== 'READY' || modelStatus !== 'READY' ? (
              <div className="text-center py-6 text-xs text-slate-500">
                {modelStatus === 'LOADING' ? 'Loading AI models…' : 'Start camera to begin security monitoring'}
              </div>
            ) : inZoneActivePersons.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">
                <div className="text-slate-400 font-semibold mb-1">NO PERSONS IN RESTRICTED ZONES</div>
                <p className="text-[11px] text-slate-500">
                  {activePersons.length > 0
                    ? `${activePersons.length} person(s) outside zone. Face processing = ZERO.`
                    : 'Webcam feed clear.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inZoneActivePersons.map((p) => {
                  const pStates = personZoneStates.filter((s) => s.personId === p.id);
                  const confirmedS = pStates.find(
                    (s) => (s.status === 'CONFIRMED_INTRUSION' || s.status === 'PENDING_EXIT') && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED')
                  );
                  const pendingS = pStates.find((s) => s.status === 'PENDING_ENTRY' && (s.identityState === 'UNKNOWN' || s.identityState === 'FACE_UNVERIFIED'));
                  const isAuth = p.identityState === 'AUTHORIZED';

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                        confirmedS
                          ? 'bg-rose-950/40 border-rose-500/60'
                          : pendingS
                          ? 'bg-amber-950/40 border-amber-500/60'
                          : isAuth
                          ? 'bg-emerald-950/40 border-emerald-500/60'
                          : 'bg-[#0a0d14] border-[#1f293d]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-100 flex items-center gap-1.5">
                          <Target
                            className={`w-3.5 h-3.5 ${
                              confirmedS ? 'text-rose-400' : pendingS ? 'text-amber-400' : isAuth ? 'text-emerald-400' : 'text-slate-400'
                            }`}
                          />
                          {p.label} (IN-ZONE)
                        </span>
                        <span className="text-slate-400 font-semibold">{(p.score * 100).toFixed(1)}%</span>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Identity State:</span>
                          {isAuth ? (
                            <span className="text-emerald-300 font-bold flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                              ✓ AUTHORIZED — {p.matchedPersonName}
                            </span>
                          ) : p.identityState === 'FACE_UNVERIFIED' ? (
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              ⚠ FACE UNVERIFIED
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <UserX className="w-3 h-3 text-amber-500" />
                              ⚠ UNKNOWN
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-[#1f293d]/60">
                          <span className="text-slate-500">Security Event:</span>
                          {isAuth ? (
                            <span className="text-emerald-300 font-semibold px-2 py-0.5 bg-emerald-950 rounded border border-emerald-800 text-[10px] flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              AUTHORIZED (NO ALARM)
                            </span>
                          ) : confirmedS ? (
                            <span className="text-white font-bold px-2 py-0.5 bg-rose-600 rounded border border-rose-500 text-[10px] flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              CONFIRMED INTRUSION
                            </span>
                          ) : pendingS ? (
                            <span className="text-amber-200 font-semibold px-2 py-0.5 bg-amber-900/80 rounded border border-amber-700 text-[10px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              VERIFYING ({pendingS.persistenceCount}/{pendingS.requiredPersistence}f)
                            </span>
                          ) : (
                            <span className="text-slate-400 px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-[10px]">
                              OUTSIDE ZONES
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#1f293d] flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Targeted In-Zone Face Recognition Engine</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
