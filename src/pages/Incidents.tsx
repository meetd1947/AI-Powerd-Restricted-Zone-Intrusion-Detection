import React, { useState, useEffect } from 'react';
import { SecurityIncident } from '../types';
import {
  getStoredIncidents,
  updateIncidentStatus,
  deleteFullIncident,
  deleteIncidentFromFirestore,
  subscribeToIncidentsFromFirestore,
  updateIncidentStatusInFirestore
} from '../services/incidentService';
import { ShieldCheck, AlertTriangle, Eye, MapPin, Camera, UserX, X, Cloud, Trash2, Loader2 } from 'lucide-react';

type DeleteState = 'IDLE' | 'CONFIRM' | 'DELETING' | 'ERROR';

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Full-evidence delete state machine
  const [deleteState, setDeleteState] = useState<DeleteState>('IDLE');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load from localStorage (instant, contains local snapshots)
    const local = getStoredIncidents();
    setIncidents(local);

    // Subscribe to Firestore real-time updates
    const unsubscribe = subscribeToIncidentsFromFirestore(
      (firestoreData) => {
        setIsCloudSynced(true);
        // Merge Firestore records with local snapshots if available
        const currentLocal = getStoredIncidents();
        const localMap = new Map(currentLocal.map((item) => [item.id, item]));

        const merged = firestoreData.map((fItem) => {
          const lItem = localMap.get(fItem.id);
          return {
            ...fItem,
            snapshotUrl: lItem?.snapshotUrl || fItem.snapshotUrl || ''
          };
        });

        // Also add any purely local incidents not yet synced
        const firestoreIds = new Set(firestoreData.map((i) => i.id));
        currentLocal.forEach((lItem) => {
          if (!firestoreIds.has(lItem.id)) {
            merged.push(lItem);
          }
        });

        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setIncidents(merged);
      },
      () => {
        setIsCloudSynced(false);
      }
    );

    const handleStorage = () => {
      const refreshed = getStoredIncidents();
      setIncidents(refreshed);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
    };
  }, []);

  const handleStatusChange = (id: string, status: 'UNACKNOWLEDGED' | 'ACKNOWLEDGED' | 'RESOLVED') => {
    updateIncidentStatus(id, status);
    updateIncidentStatusInFirestore(id, status);
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status } : inc)));
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({ ...selectedIncident, status });
    }
  };

  // ── Full-evidence delete: Firestore MUST succeed before local deletion ──────
  const handleDeleteEvidence = async () => {
    if (!selectedIncident) return;
    setDeleteState('DELETING');
    setDeleteError(null);

    try {
      // 1. Delete Firestore document first — throws on failure
      await deleteIncidentFromFirestore(selectedIncident.id);
    } catch (err) {
      // Firestore deletion failed: keep record, show error
      const msg =
        (err as Error)?.message ||
        'Firestore deletion failed. Check your connection or security rules.';
      setDeleteError(msg);
      setDeleteState('ERROR');
      return; // ← do NOT touch localStorage
    }

    // 2. Firestore success — now remove from localStorage
    deleteFullIncident(selectedIncident.id);

    // 3. Remove from React state immediately
    setIncidents((prev) => prev.filter((inc) => inc.id !== selectedIncident.id));

    // 4. Close modal
    setSelectedIncident(null);
    setDeleteState('IDLE');
    setDeleteError(null);
  };

  // Reset delete state when opening a different incident
  const openModal = (inc: SecurityIncident) => {
    setSelectedIncident(inc);
    setDeleteState('IDLE');
    setDeleteError(null);
  };

  const closeModal = () => {
    setSelectedIncident(null);
    setDeleteState('IDLE');
    setDeleteError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">STADIUM MONITORING — INCIDENTS & EVIDENCE</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time intrusion audit log, captured evidence snapshots, and incident status
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className={`px-3 py-1.5 bg-[#121722] border rounded-lg font-semibold flex items-center gap-2 ${isCloudSynced ? 'border-blue-500/40 text-blue-400' : 'border-slate-800 text-slate-400'}`}>
            <Cloud className="w-3.5 h-3.5" />
            {isCloudSynced ? 'FIRESTORE SYNCED' : 'LOCAL CACHE'}
          </span>
          <span className="px-3 py-1.5 bg-[#121722] border border-[#1f293d] rounded-lg text-slate-300 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {incidents.filter((i) => i.status === 'UNACKNOWLEDGED').length} UNACKNOWLEDGED
          </span>
          <span className="px-3 py-1.5 bg-[#121722] border border-[#1f293d] rounded-lg text-slate-400 font-semibold">
            TOTAL: {incidents.length}
          </span>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-[#0a0d14] rounded-full border border-[#1f293d] mb-4">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">No Intrusion Incidents Recorded</h3>
          <p className="text-sm text-slate-400 max-w-md mt-1 mb-4">
            No unauthorized access events detected yet. Start the camera feed in Live Cameras and allow an unknown face inside a restricted polygon to test automated evidence capture.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-[#0a0d14] px-3 py-1.5 rounded border border-[#1f293d]">
            <AlertTriangle className="w-4 h-4 text-slate-500" />
            <span>LOCAL BROWSER EVIDENCE FEED ACTIVE</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.map((inc) => {
            const isUnack = inc.status === 'UNACKNOWLEDGED';
            return (
              <div
                key={inc.id}
                className={`bg-[#121722] rounded-xl border overflow-hidden flex flex-col justify-between transition-all ${
                  isUnack ? 'border-rose-500/60 shadow-lg shadow-rose-950/20' : 'border-[#1f293d]'
                }`}
              >
                {/* Snapshot Image Preview */}
                <div className="relative w-full h-44 bg-[#0a0d14] flex items-center justify-center overflow-hidden border-b border-[#1f293d]">
                  {inc.snapshotUrl ? (
                    <img
                      src={inc.snapshotUrl}
                      alt={`Evidence ${inc.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-600">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-mono">NO SNAPSHOT</span>
                    </div>
                  )}

                  {/* Top Status Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded shadow-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {inc.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 font-mono font-bold text-[10px] rounded shadow-md ${
                        inc.zoneSeverity === 'Critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : inc.zoneSeverity === 'High'
                          ? 'bg-orange-950 text-orange-300 border border-orange-800'
                          : inc.zoneSeverity === 'Medium'
                          ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {inc.zoneSeverity.toUpperCase()}
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-0.5 bg-black/80 text-slate-200 font-mono text-[10px] rounded border border-slate-800">
                      {inc.displayTime.split('•')[0].trim()}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-400" />
                        <span>{inc.zoneName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-[#0a0d14] px-2 py-0.5 rounded border border-[#1f293d]">
                        {inc.zoneType}
                      </span>
                    </div>

                    <div className="text-slate-400 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Identity:</span>
                        <span className="text-rose-300 font-bold flex items-center gap-1">
                          <UserX className="w-3 h-3 text-rose-400" />
                          UNKNOWN FACE ({inc.faceLabel})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Confidence:</span>
                        <span className="text-slate-300">{(inc.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Camera:</span>
                        <span className="text-slate-300 truncate max-w-[140px]">{inc.cameraName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Time:</span>
                        <span className="text-slate-300">{inc.displayTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="pt-3 border-t border-[#1f293d] flex items-center justify-between gap-2">
                    <button
                      onClick={() => openModal(inc)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-lg font-semibold transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>VIEW EVIDENCE</span>
                    </button>

                    {isUnack ? (
                      <button
                        onClick={() => handleStatusChange(inc.id, 'ACKNOWLEDGED')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-all"
                        title="Mark Acknowledged"
                      >
                        ACKNOWLEDGE
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono font-bold text-[10px]">
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Incident Detail Modal ─────────────────────────────────────────────── */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1f293d]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-lg text-white">Intrusion Evidence — {selectedIncident.id}</h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-white rounded"
                disabled={deleteState === 'DELETING'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Large Snapshot */}
            <div className="relative w-full bg-[#0a0d14] rounded-lg border border-[#1f293d] overflow-hidden min-h-[260px] flex items-center justify-center">
              {selectedIncident.snapshotUrl ? (
                <img
                  src={selectedIncident.snapshotUrl}
                  alt={`Evidence Snapshot ${selectedIncident.id}`}
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              ) : (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
                  <Camera className="w-10 h-10 opacity-40" />
                  <span className="text-sm font-mono">No evidence snapshot available</span>
                </div>
              )}
            </div>

            {/* Detailed Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#0a0d14] p-4 rounded-lg border border-[#1f293d]">
              <div>
                <span className="text-slate-500 block text-[10px]">EVENT ID</span>
                <span className="text-slate-200 font-bold">{selectedIncident.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
                <span className="text-slate-200">{selectedIncident.displayTime}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RESTRICTED ZONE</span>
                <span className="text-rose-400 font-bold">{selectedIncident.zoneName} ({selectedIncident.zoneType})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SEVERITY</span>
                <span className="text-purple-400 font-bold">{selectedIncident.zoneSeverity}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SUBJECT IDENTITY</span>
                <span className="text-rose-400 font-bold">UNKNOWN FACE ({selectedIncident.faceLabel})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DETECTION CONFIDENCE</span>
                <span className="text-slate-200">{(selectedIncident.confidence * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">NORMALIZED CENTROID</span>
                <span className="text-slate-200">({selectedIncident.centroid.x.toFixed(3)}, {selectedIncident.centroid.y.toFixed(3)})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CAMERA SOURCE</span>
                <span className="text-slate-200">{selectedIncident.cameraName}</span>
              </div>
            </div>

            {/* ── Delete Full Evidence — confirmation panel ── */}
            {deleteState === 'CONFIRM' && (
              <div className="rounded-lg border border-rose-700/70 bg-rose-950/40 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-rose-300">Delete this entire evidence record?</p>
                    <p className="text-xs text-rose-400/80 font-mono leading-relaxed">
                      This will permanently remove:
                      <br />• Evidence snapshot
                      <br />• Incident record &amp; metadata
                      <br />• Firestore cloud document
                      <br />
                      <span className="text-rose-300 font-bold">This action cannot be undone.</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setDeleteState('IDLE')}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-delete-evidence"
                    onClick={handleDeleteEvidence}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Evidence
                  </button>
                </div>
              </div>
            )}

            {/* Deleting spinner */}
            {deleteState === 'DELETING' && (
              <div className="rounded-lg border border-rose-800/50 bg-rose-950/30 px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                <span className="text-xs font-mono text-rose-300">Deleting evidence from Firestore…</span>
              </div>
            )}

            {/* Error panel */}
            {deleteState === 'ERROR' && deleteError && (
              <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-amber-300 font-mono">Firestore deletion failed — record preserved</p>
                <p className="text-[11px] text-amber-400/80 font-mono break-all">{deleteError}</p>
                <button
                  onClick={() => setDeleteState('IDLE')}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-between items-center gap-3 pt-2 border-t border-[#1f293d]">
              {/* Delete Evidence — left side, only show when IDLE */}
              {deleteState === 'IDLE' && (
                <button
                  id="btn-delete-evidence"
                  onClick={() => setDeleteState('CONFIRM')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-800/50 rounded-lg text-xs font-semibold transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  DELETE EVIDENCE
                </button>
              )}
              {deleteState !== 'IDLE' && <div />}

              {/* Close — right side */}
              <button
                onClick={closeModal}
                disabled={deleteState === 'DELETING'}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
              >
                CLOSE EVIDENCE
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
