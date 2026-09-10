import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraStatus, RestrictedZone, PolygonPoint, ZoneType, ZoneSeverity } from '../types';
import { 
  Camera, 
  Video, 
  VideoOff, 
  Target, 
  Plus, 
  Check, 
  Trash2, 
  RotateCcw, 
  Save, 
  Edit3, 
  Sliders, 
  AlertCircle, 
  ShieldAlert, 
  RefreshCw,
  Layers
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'stadium_sentinel_zones';

export const ZoneCalibration: React.FC = () => {
  // Camera state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('STOPPED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calibration state
  const [savedZones, setSavedZones] = useState<RestrictedZone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<PolygonPoint[]>([]);
  const [mousePos, setMousePos] = useState<PolygonPoint | null>(null);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);

  // Form state
  const [zoneName, setZoneName] = useState<string>('Restricted Zone Alpha');
  const [zoneType, setZoneType] = useState<ZoneType>('Player Area');
  const [zoneSeverity, setZoneSeverity] = useState<ZoneSeverity>('High');
  const [minConfidence, setMinConfidence] = useState<number>(0.50);
  const [persistenceFrames, setPersistenceFrames] = useState<number>(5);
  const [minDwellSeconds, setMinDwellSeconds] = useState<number>(2.0);
  const [formError, setFormError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load saved zones from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: RestrictedZone[] = JSON.parse(stored);
        setSavedZones(parsed);
        if (parsed.length > 0) {
          setActiveZoneId(parsed[0].id);
          setCurrentPoints(parsed[0].points);
          setZoneName(parsed[0].name);
          setZoneType(parsed[0].type);
          setZoneSeverity(parsed[0].severity);
        }
      }
    } catch {
      console.warn('Failed to parse saved zones from localStorage.');
    }
  }, []);

  // Save zones to localStorage
  const persistZones = (zones: RestrictedZone[]) => {
    setSavedZones(zones);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(zones));
    } catch {
      console.warn('Failed to save zones to localStorage.');
    }
  };

  // Stop active webcam stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('STOPPED');
    setErrorMessage(null);
  }, []);

  // Start laptop webcam
  const startCamera = async () => {
    stopCamera();
    setCameraStatus('REQUESTING');
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API is not supported in your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setCameraStatus('READY');
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraStatus('DENIED');
        setErrorMessage('Camera access denied by browser permissions.');
      } else {
        setCameraStatus('ERROR');
        setErrorMessage(error.message || 'Unable to access webcam.');
      }
    }
  };

  // Render Canvas Polygon (Converts normalized coordinates 0..1 to canvas pixel coords)
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const width = video.clientWidth;
    const height = video.clientHeight;

    if (width === 0 || height === 0) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Render polygon if points exist
    if (currentPoints.length > 0) {
      ctx.beginPath();
      const firstPixelX = currentPoints[0].x * width;
      const firstPixelY = currentPoints[0].y * height;
      ctx.moveTo(firstPixelX, firstPixelY);

      for (let i = 1; i < currentPoints.length; i++) {
        const px = currentPoints[i].x * width;
        const py = currentPoints[i].y * height;
        ctx.lineTo(px, py);
      }

      // If drawing, preview line to cursor
      if (isDrawing && mousePos) {
        ctx.lineTo(mousePos.x * width, mousePos.y * height);
      } else if (currentPoints.length >= 3) {
        ctx.closePath();
      }

      // Severity-based polygon color palette
      const getSeverityPolygonColor = (sev: typeof zoneSeverity) => {
        switch (sev) {
          case 'Critical':
            return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.25)' };
          case 'High':
            return { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.22)' };
          case 'Medium':
            return { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.20)' };
          case 'Low':
            return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.18)' };
          default:
            return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.25)' };
        }
      };

      const sevColor = getSeverityPolygonColor(zoneSeverity);
      const fillColor = isDrawing ? 'rgba(37, 99, 235, 0.15)' : sevColor.fill;
      const strokeColor = isDrawing ? '#2563eb' : sevColor.stroke;

      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();

      // Render vertices
      currentPoints.forEach((pt, index) => {
        const vx = pt.x * width;
        const vy = pt.y * height;

        const isDragged = draggedVertexIndex === index;

        ctx.beginPath();
        ctx.arc(vx, vy, isDragged ? 8 : 6, 0, 2 * Math.PI);
        ctx.fillStyle = isDragged ? '#f59e0b' : '#2563eb';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Vertex index label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${index + 1}`, vx + 10, vy - 10);
      });

      // Zone label in center of polygon
      if (currentPoints.length >= 3 && !isDrawing) {
        const avgX = (currentPoints.reduce((sum, p) => sum + p.x, 0) / currentPoints.length) * width;
        const avgY = (currentPoints.reduce((sum, p) => sum + p.y, 0) / currentPoints.length) * height;

        ctx.fillStyle = 'rgba(18, 23, 34, 0.85)';
        ctx.fillRect(avgX - 45, avgY - 14, 90, 24);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(avgX - 45, avgY - 14, 90, 24);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(zoneName.toUpperCase().slice(0, 10), avgX, avgY + 2);
        ctx.textAlign = 'left';
      }
    }
  }, [currentPoints, isDrawing, mousePos, draggedVertexIndex, zoneName]);

  // Keep drawing loop synced with state & canvas size
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ResizeObserver to automatically scale normalized polygon coordinates on window resize
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new ResizeObserver(() => {
      drawCanvas();
    });

    observer.observe(video);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [drawCanvas]);

  // Clean up webcam on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Handle Canvas Click to add vertex
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, canvasX / canvas.width));
    const normY = Math.max(0, Math.min(1, canvasY / canvas.height));

    setCurrentPoints((prev) => [...prev, { x: normX, y: normY }]);
    setFormError(null);
  };

  // Track Mouse Movement for drawing preview & vertex dragging
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, canvasX / canvas.width));
    const normY = Math.max(0, Math.min(1, canvasY / canvas.height));

    setMousePos({ x: normX, y: normY });

    // Handle vertex drag
    if (draggedVertexIndex !== null) {
      setCurrentPoints((prev) => {
        const next = [...prev];
        next[draggedVertexIndex] = { x: normX, y: normY };
        return next;
      });
    }
  };

  // Mouse Down to select vertex for dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked near any vertex (radius <= 12px)
    const thresholdPixels = 12;
    for (let i = 0; i < currentPoints.length; i++) {
      const vx = currentPoints[i].x * canvas.width;
      const vy = currentPoints[i].y * canvas.height;

      const dist = Math.hypot(clickX - vx, clickY - vy);
      if (dist <= thresholdPixels) {
        setDraggedVertexIndex(i);
        break;
      }
    }
  };

  // Mouse Up to release vertex drag
  const handleCanvasMouseUp = () => {
    setDraggedVertexIndex(null);
  };

  // Calibration action handlers
  const handleStartDraw = () => {
    setIsDrawing(true);
    setCurrentPoints([]);
    setActiveZoneId(null);
    setFormError(null);
  };

  const handleFinishDraw = () => {
    if (currentPoints.length < 3) {
      setFormError('A valid polygon zone requires at least 3 vertices.');
      return;
    }
    setIsDrawing(false);
    setFormError(null);
  };

  const handleResetDraw = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
    setFormError(null);
  };

  const handleSaveZone = () => {
    if (currentPoints.length < 3) {
      setFormError('Cannot save incomplete zone. Polygon requires at least 3 points.');
      return;
    }

    if (!zoneName.trim()) {
      setFormError('Please enter a descriptive zone name.');
      return;
    }

    const zoneId = activeZoneId || `zone_${Date.now()}`;
    const newZone: RestrictedZone = {
      id: zoneId,
      name: zoneName.trim(),
      type: zoneType,
      severity: zoneSeverity,
      points: currentPoints,
      status: 'CONFIGURED',
      minConfidence: Math.max(0.1, Math.min(1.0, minConfidence)),
      persistenceFrames: Math.max(1, Math.min(30, persistenceFrames)),
      minDwellSeconds: Math.max(0.0, Math.min(60.0, minDwellSeconds)),
      createdAt: new Date().toISOString()
    };

    const existingIndex = savedZones.findIndex((z) => z.id === zoneId);
    let updated: RestrictedZone[];
    if (existingIndex >= 0) {
      updated = [...savedZones];
      updated[existingIndex] = newZone;
    } else {
      updated = [...savedZones, newZone];
    }

    persistZones(updated);
    setActiveZoneId(zoneId);
    setFormError(null);
  };

  const handleDeleteZone = (id: string) => {
    const updated = savedZones.filter((z) => z.id !== id);
    persistZones(updated);
    if (activeZoneId === id) {
      if (updated.length > 0) {
        selectZone(updated[0]);
      } else {
        setActiveZoneId(null);
        setCurrentPoints([]);
      }
    }
  };

  const selectZone = (zone: RestrictedZone) => {
    setIsDrawing(false);
    setActiveZoneId(zone.id);
    setCurrentPoints(zone.points);
    setZoneName(zone.name);
    setZoneType(zone.type);
    setZoneSeverity(zone.severity);
    setMinConfidence(zone.minConfidence ?? 0.50);
    setPersistenceFrames(zone.persistenceFrames ?? 5);
    setMinDwellSeconds(zone.minDwellSeconds ?? 2.0);
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">STADIUM MONITORING — RESTRICTED ZONE CALIBRATION</h2>
          <p className="text-xs text-slate-400 mt-1">Define interactive polygon boundaries using normalized coordinates</p>
        </div>

        {/* Camera Control Buttons */}
        <div className="flex items-center gap-3">
          {cameraStatus !== 'READY' && cameraStatus !== 'REQUESTING' ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-900/30 transition-all"
            >
              <Video className="w-4 h-4" />
              <span>START CAMERA</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition-all"
            >
              <VideoOff className="w-4 h-4 text-rose-400" />
              <span>STOP CAMERA</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Calibration Workplace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Live Camera + Canvas Calibration Area */}
        <div className="lg:col-span-3 bg-[#121722] border border-[#1f293d] rounded-xl p-4 flex flex-col justify-between min-h-[460px]">
          {/* Header Bar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[#1f293d] text-xs">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-slate-200 font-semibold font-mono">CALIBRATION CANVAS</span>
              <span className="text-slate-500 font-mono">|</span>
              <span className="text-slate-400 font-mono">
                {isDrawing ? 'DRAWING MODE ACTIVE' : activeZoneId ? 'ZONE SELECTED' : 'STANDBY'}
              </span>
            </div>

            {/* Polygon Tool Controls */}
            <div className="flex items-center gap-2">
              {!isDrawing ? (
                <button
                  onClick={handleStartDraw}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>DRAW ZONE</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFinishDraw}
                    disabled={currentPoints.length < 3}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>FINISH ZONE ({currentPoints.length} PTS)</span>
                  </button>
                  <button
                    onClick={handleResetDraw}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded border border-slate-700 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RESET</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Webcam + Canvas Display */}
          <div
            ref={containerRef}
            className="relative w-full flex-1 flex items-center justify-center bg-[#0a0d14] rounded-lg overflow-hidden border border-[#1f293d] min-h-[380px] select-none"
          >
            {/* HTML5 Video */}
            <video
              ref={videoRef}
              onLoadedMetadata={drawCanvas}
              autoPlay
              playsInline
              muted
              className={`w-full h-auto max-h-[500px] object-contain ${
                cameraStatus === 'READY' ? 'block' : 'hidden'
              }`}
            />

            {/* Canvas Calibration Layer */}
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              className={`absolute top-0 left-0 ${
                cameraStatus === 'READY' ? 'block' : 'hidden'
              } ${isDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
            />

            {/* Camera Status Display when stopped */}
            {cameraStatus === 'STOPPED' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-[#121722] rounded-full border border-[#1f293d] mb-3">
                  <Camera className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-300">Camera Feed Off</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Start your laptop webcam to calibrate restricted zone polygon boundaries over the live video.
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  START CAMERA
                </button>
              </div>
            )}

            {cameraStatus === 'REQUESTING' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                <h3 className="text-base font-semibold text-slate-200">Requesting Camera Permission</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Please allow webcam access in your browser address bar.
                </p>
              </div>
            )}

            {cameraStatus === 'DENIED' && (
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

            {cameraStatus === 'ERROR' && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                <h3 className="text-base font-semibold text-rose-400">Webcam Error</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Footer Instruction Banner */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-3 border-t border-[#1f293d]">
            <div>
              {isDrawing ? (
                <span className="text-blue-400 font-semibold animate-pulse">
                  ➜ CLICK ON VIDEO TO ADD POLYGON VERTICES ({currentPoints.length} ADDED)
                </span>
              ) : currentPoints.length > 0 ? (
                <span className="text-slate-400">
                  ➜ DRAG VERTEX CIRCLES TO EDIT POLYGON BOUNDARY
                </span>
              ) : (
                <span>➜ CLICK 'DRAW ZONE' TO START CALIBRATING A NEW RESTRICTED POLYGON</span>
              )}
            </div>
            <div>
              <span>NORMALIZED COORDS (0.0 – 1.0)</span>
            </div>
          </div>
        </div>

        {/* Zone Parameters Configuration Sidebar */}
        <div className="space-y-6">
          {/* Configuration Form */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1f293d]">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-sm text-slate-200">Zone Properties</h3>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800/60 rounded text-xs text-rose-300 font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">ZONE NAME</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Player Dugout A"
                  className="w-full bg-[#0a0d14] border border-[#1f293d] focus:border-blue-500 rounded px-3 py-2 text-slate-200 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">ZONE TYPE</label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value as ZoneType)}
                  className="w-full bg-[#0a0d14] border border-[#1f293d] focus:border-blue-500 rounded px-3 py-2 text-slate-200 outline-none font-medium"
                >
                  <option value="Pitch">Pitch Area</option>
                  <option value="Player Area">Player Area</option>
                  <option value="Equipment Area">Equipment Area</option>
                  <option value="Service Entrance">Service Entrance</option>
                  <option value="Custom">Custom Area</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">SEVERITY LEVEL</label>
                <select
                  value={zoneSeverity}
                  onChange={(e) => setZoneSeverity(e.target.value as ZoneSeverity)}
                  className="w-full bg-[#0a0d14] border border-[#1f293d] focus:border-blue-500 rounded px-3 py-2 text-slate-200 outline-none font-medium"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="pt-2 border-t border-[#1f293d] space-y-3">
                <div className="text-[11px] font-semibold text-blue-400 font-mono">PHASE 7 TEMPORAL THRESHOLDS</div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-mono mb-1">MIN CONFIDENCE</label>
                    <div className="flex items-center gap-1 bg-[#0a0d14] border border-[#1f293d] rounded px-2 py-1.5">
                      <input
                        type="number"
                        min="10"
                        max="95"
                        step="5"
                        value={Math.round(minConfidence * 100)}
                        onChange={(e) => setMinConfidence((Number(e.target.value) || 50) / 100)}
                        className="w-full bg-transparent text-slate-200 text-xs font-mono outline-none"
                      />
                      <span className="text-slate-500 text-[10px]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-mono mb-1">PERSISTENCE</label>
                    <div className="flex items-center gap-1 bg-[#0a0d14] border border-[#1f293d] rounded px-2 py-1.5">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        value={persistenceFrames}
                        onChange={(e) => setPersistenceFrames(Math.max(1, Number(e.target.value) || 5))}
                        className="w-full bg-transparent text-slate-200 text-xs font-mono outline-none"
                      />
                      <span className="text-slate-500 text-[10px]">f</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] font-mono mb-1">MIN DWELL TIME</label>
                  <div className="flex items-center gap-1 bg-[#0a0d14] border border-[#1f293d] rounded px-2 py-1.5">
                    <input
                      type="number"
                      min="0.5"
                      max="30"
                      step="0.5"
                      value={minDwellSeconds}
                      onChange={(e) => setMinDwellSeconds(Math.max(0, Number(e.target.value) || 2.0))}
                      className="w-full bg-transparent text-slate-200 text-xs font-mono outline-none"
                    />
                    <span className="text-slate-500 text-[10px]">sec</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveZone}
                  disabled={currentPoints.length < 3}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>SAVE ZONE</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configured Zones List */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d] mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm text-slate-200">Configured Zones</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">{savedZones.length} SAVED</span>
            </div>

            {savedZones.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No saved zones yet. Draw and save your first polygon boundary above.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedZones.map((z) => {
                  const isSelected = activeZoneId === z.id;
                  return (
                    <div
                      key={z.id}
                      onClick={() => selectZone(z)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/50 text-white'
                          : 'bg-[#0a0d14] border-[#1f293d] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{z.name}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {z.type} • {z.severity} • {z.points.length} pts
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectZone(z);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-400"
                          title="Edit Zone"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteZone(z.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
