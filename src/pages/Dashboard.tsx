import React, { useState, useEffect } from 'react';
import {
  Camera,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Video,
  UserX,
  Clock,
  ShieldAlert,
  Layers,
  UserCheck,
  ArrowRight,
  MonitorPlay,
  CheckCircle2
} from 'lucide-react';
import { AuthorizedPerson, RestrictedZone, SecurityIncident } from '../types';
import { getStoredIncidents, subscribeToIncidentsFromFirestore } from '../services/incidentService';
import { subscribeToPersonsFromFirestore } from '../services/firestorePersonService';

interface DashboardProps {
  onNavigateToCameras?: () => void;
  onNavigateToIncidents?: () => void;
}

const ZONES_STORAGE_KEY = 'stadium_sentinel_zones';
const PERSONS_STORAGE_KEY = 'stadium_sentinel_authorized_persons';

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToCameras, onNavigateToIncidents }) => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);

  const loadData = () => {
    const storedIncidents = getStoredIncidents();
    setIncidents(storedIncidents);

    try {
      const storedPersons = localStorage.getItem(PERSONS_STORAGE_KEY);
      if (storedPersons) setAuthorizedPersons(JSON.parse(storedPersons));

      const storedZones = localStorage.getItem(ZONES_STORAGE_KEY);
      if (storedZones) setZones(JSON.parse(storedZones));
    } catch {
      console.warn('Failed to parse stored configuration in Dashboard.');
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribeIncidents = subscribeToIncidentsFromFirestore(
      (firestoreIncidents) => {
        if (firestoreIncidents.length > 0) {
          setIncidents(firestoreIncidents);
        }
      },
      () => {}
    );

    const unsubscribePersons = subscribeToPersonsFromFirestore(
      (persons) => {
        if (persons.length > 0) {
          setAuthorizedPersons(persons);
        }
      },
      () => {}
    );

    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', loadData);

    return () => {
      unsubscribeIncidents();
      unsubscribePersons();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', loadData);
    };
  }, []);

  const unackCount = incidents.filter((i) => i.status === 'UNACKNOWLEDGED').length;
  const activeIntrusions = incidents.filter((i) => i.status === 'UNACKNOWLEDGED');

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
      case 'High':
        return 'bg-orange-950/80 text-orange-400 border-orange-800/80';
      case 'Medium':
        return 'bg-yellow-950/80 text-yellow-400 border-yellow-800/80';
      case 'Low':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
      default:
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. BRANDING & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1f293d]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">STADIUM MONITORING</h2>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SOC CONTROL ROOM
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live restricted-zone surveillance, face security & automated threat detection</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#121722] border border-[#1f293d] rounded-lg text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${unackCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-slate-300 font-semibold">
              {unackCount > 0 ? `${unackCount} ACTIVE INTRUSION ALARMS` : 'PERIMETER SECURE'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. REAL SECURITY STATUS (Compact Status Bar) */}
      <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="flex items-center gap-3 bg-[#0a0d14] p-3 rounded-lg border border-[#1f293d]">
          <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px]">CAMERA STATUS</div>
            <div className="text-emerald-400 font-bold text-xs flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ONLINE (CAM-01)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0d14] p-3 rounded-lg border border-[#1f293d]">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px]">AI DETECTION</div>
            <div className="text-emerald-400 font-bold text-xs flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              AI READY
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0d14] p-3 rounded-lg border border-[#1f293d]">
          <MonitorPlay className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px]">SURVEILLANCE ENGINE</div>
            <div className="text-cyan-400 font-bold text-xs flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              ACTIVE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0d14] p-3 rounded-lg border border-[#1f293d]">
          <AlertTriangle className={`w-4 h-4 shrink-0 ${unackCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          <div>
            <div className="text-slate-400 text-[10px]">ACTIVE INTRUSION</div>
            <div className={`font-bold text-xs flex items-center gap-1 mt-0.5 ${unackCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {unackCount > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  YES ({unackCount} BREACH)
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  NO THREATS
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: LIVE STADIUM MONITORING & ACTIVE ALERTS & RECENT EVENTS (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* 3.A LIVE STADIUM MONITORING */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d]">
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-base text-slate-200 uppercase tracking-wider font-mono">LIVE STADIUM MONITORING</h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/60 font-bold">
                CAM-01 • WEBCAM FEED
              </span>
            </div>

            {/* Live Camera Stream Area */}
            <div className="relative bg-[#0a0d14] rounded-xl border border-[#1f293d] overflow-hidden min-h-[320px] flex flex-col items-center justify-center p-8 text-center group">
              <div className="p-4 bg-cyan-950/40 rounded-full border border-cyan-800/40 mb-3">
                <Camera className="w-10 h-10 text-cyan-400" />
              </div>
              <h4 className="text-base font-bold text-slate-200 font-mono">PRIMARY STADIUM FEED (CAM-01)</h4>
              <p className="text-xs text-slate-400 max-w-md mt-1 mb-5 font-sans">
                Real-time person tracking, face recognition, restricted zone boundaries, and automated intrusion evidence capture.
              </p>
              {onNavigateToCameras && (
                <button
                  onClick={onNavigateToCameras}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-cyan-950 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>LAUNCH LIVE SURVEILLANCE FEED</span>
                </button>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#121722]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-[#1f293d]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SURVEILLANCE: ACTIVE</span>
                </div>
                <div>ZONES: {zones.length} BOUNDARIES</div>
                <div>GALLERY: {authorizedPersons.length} PROFILES</div>
              </div>
            </div>
          </div>

          {/* 3.C ACTIVE SECURITY ALERT */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="font-semibold text-base text-slate-200 uppercase tracking-wider font-mono">ACTIVE SECURITY ALERT</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${unackCount > 0 ? 'bg-rose-950/80 text-rose-400 border-rose-800/80' : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'}`}>
                {unackCount > 0 ? `${unackCount} ACTIVE BREACH` : 'NO THREATS'}
              </span>
            </div>

            {activeIntrusions.length === 0 ? (
              <div className="py-8 text-center bg-[#0a0d14]/40 border border-[#1f293d] rounded-xl flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-full">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-sm font-bold text-slate-200 font-mono">NO ACTIVE SECURITY THREATS</div>
                <p className="text-xs text-slate-400 max-w-sm font-sans">
                  All stadium restricted zones are perimeter-clear. Confirmed breaches will immediately alert here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {activeIntrusions.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 bg-rose-950/20 border border-rose-800/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {inc.snapshotUrl ? (
                        <img
                          src={inc.snapshotUrl}
                          alt={inc.id}
                          className="w-16 h-16 object-cover rounded-lg border border-rose-700/60 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[#0a0d14] rounded-lg flex items-center justify-center border border-rose-900/60 text-rose-400 shrink-0 font-mono text-xs font-bold">
                          NO SNAP
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 text-sm">{inc.zoneName}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getSeverityBadgeClass(inc.zoneSeverity)}`}>
                            {inc.zoneSeverity.toUpperCase()}
                          </span>
                        </div>

                        <div className="text-xs text-rose-300 font-mono flex items-center gap-2">
                          <UserX className="w-3.5 h-3.5 text-rose-400" />
                          <span>{inc.identityStatus === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : `UNKNOWN (${inc.faceLabel})`}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3 text-slate-400" />
                            CAM-01
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {inc.displayTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {onNavigateToIncidents && (
                      <button
                        onClick={onNavigateToIncidents}
                        className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-rose-950 shrink-0 cursor-pointer"
                      >
                        REVIEW EVIDENCE
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3.D RECENT SECURITY EVENTS */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d]">
              <div>
                <h3 className="font-semibold text-base text-slate-200 uppercase tracking-wider font-mono">RECENT SECURITY EVENTS</h3>
                <p className="text-xs text-slate-400">Confirmed security incident log</p>
              </div>
              {onNavigateToIncidents && (
                <button
                  onClick={onNavigateToIncidents}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>VIEW ALL ({incidents.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {incidents.length === 0 ? (
              <div className="py-8 text-center bg-[#0a0d14]/40 border border-[#1f293d] rounded-xl text-xs text-slate-500">
                No recent security events recorded.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {incidents.slice(0, 5).map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 bg-[#0a0d14] border border-[#1f293d] rounded-lg flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {inc.snapshotUrl ? (
                        <img
                          src={inc.snapshotUrl}
                          alt={inc.id}
                          className="w-11 h-11 object-cover rounded-lg border border-[#1f293d] shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 bg-[#121722] rounded-lg border border-[#1f293d] flex items-center justify-center text-slate-600 shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span className="truncate">{inc.zoneName}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getSeverityBadgeClass(inc.zoneSeverity)}`}>
                            {inc.zoneSeverity}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="text-rose-400">{inc.identityStatus === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : `UNKNOWN (${inc.faceLabel})`}</span>
                          <span>•</span>
                          <span className="text-slate-500">{inc.displayTime.split('•')[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {inc.status === 'UNACKNOWLEDGED' ? (
                        <span className="text-[10px] px-2 py-0.5 bg-rose-950 text-rose-400 rounded border border-rose-800 font-bold">
                          UNACKNOWLEDGED
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-800 font-bold">
                          ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: STADIUM ZONE OVERVIEW & AUTHORIZED GALLERY (1/3 width) */}
        <div className="space-y-6">

          {/* 3.E STADIUM ZONE OVERVIEW */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-base text-slate-200 uppercase tracking-wider font-mono">STADIUM ZONE OVERVIEW</h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/60">
                {zones.length} ZONES
              </span>
            </div>

            {zones.length === 0 ? (
              <div className="py-8 text-center bg-[#0a0d14]/40 border border-[#1f293d] rounded-xl text-xs text-slate-500 font-mono">
                No restricted zones configured yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {zones.map((z) => (
                  <div
                    key={z.id}
                    className="p-3.5 bg-[#0a0d14] rounded-lg border border-[#1f293d] space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 truncate">{z.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${getSeverityBadgeClass(z.severity)}`}>
                        {z.severity}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>TYPE:</span>
                        <span className="text-slate-300 font-semibold">{z.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>VERTICES:</span>
                        <span className="text-slate-300">{z.points.length} PTS</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>DWELL THRESHOLD:</span>
                        <span className="text-slate-300">{z.minDwellSeconds ?? 2.0}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AUTHORIZED GALLERY SUMMARY */}
          <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f293d]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-base text-slate-200 uppercase tracking-wider font-mono">AUTHORIZED GALLERY</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/60">
                {authorizedPersons.length} PROFILES
              </span>
            </div>

            {authorizedPersons.length === 0 ? (
              <div className="py-6 text-center bg-[#0a0d14]/40 border border-[#1f293d] rounded-xl text-xs text-slate-500 font-mono">
                No authorized profiles registered.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {authorizedPersons.slice(0, 4).map((p) => (
                  <div key={p.id} className="p-2.5 bg-[#0a0d14] rounded-lg border border-[#1f293d] flex items-center gap-3 text-xs font-mono">
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="w-10 h-10 object-cover rounded-lg border border-emerald-800/60 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">{p.name}</div>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3" />
                        AUTHORIZED
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

