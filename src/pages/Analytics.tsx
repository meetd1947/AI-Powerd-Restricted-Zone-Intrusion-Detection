import React, { useState, useEffect } from 'react';
import {
  Filter,
  TrendingUp,
  MapPin,
  PieChart,
  Clock,
  CheckCircle,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { SecurityIncident, RestrictedZone } from '../types';
import { getStoredIncidents, subscribeToIncidentsFromFirestore, updateIncidentStatus } from '../services/incidentService';

const ZONES_STORAGE_KEY = 'stadium_sentinel_zones';

export const Analytics: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);

  // Dropdown filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');

  const loadData = () => {
    const data = getStoredIncidents();
    setIncidents(data);

    try {
      const storedZones = localStorage.getItem(ZONES_STORAGE_KEY);
      if (storedZones) setZones(JSON.parse(storedZones));
    } catch {
      console.warn('Failed to parse zones in Analytics.');
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToIncidentsFromFirestore(
      (firestoreData) => {
        if (firestoreData.length > 0) {
          setIncidents(firestoreData);
        }
      },
      () => {
        // Fallback to local
      }
    );

    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', loadData);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', loadData);
    };
  }, []);

  // Filtered incidents calculation
  const filteredIncidents = incidents.filter((inc) => {
    // Category filter
    if (categoryFilter === 'CRITICAL' && inc.zoneSeverity !== 'Critical') return false;
    if (categoryFilter === 'HIGH' && inc.zoneSeverity !== 'High') return false;
    if (categoryFilter === 'MEDIUM' && inc.zoneSeverity !== 'Medium') return false;
    if (categoryFilter === 'LOW' && inc.zoneSeverity !== 'Low') return false;
    if (categoryFilter === 'UNKNOWN' && inc.identityStatus !== 'UNKNOWN') return false;
    if (categoryFilter === 'FACE_UNVERIFIED' && inc.identityStatus !== 'FACE_UNVERIFIED') return false;
    if (categoryFilter === 'ACKNOWLEDGED' && inc.status !== 'ACKNOWLEDGED') return false;
    if (categoryFilter === 'UNACKNOWLEDGED' && inc.status !== 'UNACKNOWLEDGED') return false;

    // Zone filter
    if (zoneFilter !== 'ALL' && inc.zoneId !== zoneFilter) return false;

    // Time filter
    if (timeFilter !== 'ALL') {
      const now = Date.now();
      const incTime = new Date(inc.timestamp).getTime();
      if (timeFilter === 'TODAY') {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        if (incTime < todayStart) return false;
      } else if (timeFilter === '7DAYS') {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        if (incTime < sevenDaysAgo) return false;
      } else if (timeFilter === '30DAYS') {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (incTime < thirtyDaysAgo) return false;
      }
    }

    return true;
  });

  // Analytics computed from filtered dataset
  const criticalCount = filteredIncidents.filter((i) => i.zoneSeverity === 'Critical').length;
  const highCount = filteredIncidents.filter((i) => i.zoneSeverity === 'High').length;
  const mediumCount = filteredIncidents.filter((i) => i.zoneSeverity === 'Medium').length;
  const lowCount = filteredIncidents.filter((i) => i.zoneSeverity === 'Low').length;
  const totalFilteredCount = filteredIncidents.length;

  const criticalPct = totalFilteredCount > 0 ? Math.round((criticalCount / totalFilteredCount) * 100) : 0;
  const highPct = totalFilteredCount > 0 ? Math.round((highCount / totalFilteredCount) * 100) : 0;
  const mediumPct = totalFilteredCount > 0 ? Math.round((mediumCount / totalFilteredCount) * 100) : 0;
  const lowPct = totalFilteredCount > 0 ? Math.round((lowCount / totalFilteredCount) * 100) : 0;

  // Zone Breach Breakdown from filtered dataset
  const zoneBreachMap: Record<string, { count: number; severity: string; name: string }> = {};
  filteredIncidents.forEach((inc) => {
    if (!zoneBreachMap[inc.zoneId]) {
      zoneBreachMap[inc.zoneId] = { count: 0, severity: inc.zoneSeverity, name: inc.zoneName };
    }
    zoneBreachMap[inc.zoneId].count += 1;
  });
  const sortedZones = Object.values(zoneBreachMap).sort((a, b) => b.count - a.count);

  const handleToggleAcknowledge = (inc: SecurityIncident) => {
    const nextStatus = inc.status === 'ACKNOWLEDGED' ? 'UNACKNOWLEDGED' : 'ACKNOWLEDGED';
    const updated = updateIncidentStatus(inc.id, nextStatus);
    setIncidents(updated);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1e2a45] pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide font-mono uppercase flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
            STADIUM MONITORING — SECURITY ANALYTICS
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Filter, inspect and analyze real restricted zone incidents by category, zone, and time range
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#121829] border border-[#1e2a45] rounded-lg text-xs font-mono text-slate-300">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span>LIVE ANALYTICS ENGINE</span>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-[#121829] border border-[#1e2a45] rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Security Incident Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">CATEGORY</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-[#090d16] border border-[#1e2a45] rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="CRITICAL">Critical Severity</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
              <option value="UNKNOWN">Unknown Person</option>
              <option value="FACE_UNVERIFIED">Face Unverified (Masked)</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="UNACKNOWLEDGED">Unacknowledged</option>
            </select>
          </div>

          {/* Zone Dropdown */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">RESTRICTED ZONE</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full bg-[#090d16] border border-[#1e2a45] rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.severity})
                </option>
              ))}
            </select>
          </div>

          {/* Time Dropdown */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">TIME RANGE</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full bg-[#090d16] border border-[#1e2a45] rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Filter Summary pill */}
        <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-300 border-t border-[#1e2a45]/60">
          <div>
            SHOWING <span className="text-white font-bold">{totalFilteredCount}</span> MATCHING INCIDENTS (OF {incidents.length} TOTAL)
          </div>
          {(categoryFilter !== 'ALL' || zoneFilter !== 'ALL' || timeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setZoneFilter('ALL');
                setTimeFilter('ALL');
              }}
              className="text-blue-400 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* FILTERED ANALYTICS SUMMARY + ZONE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Severity Distribution for Filtered Results (2/3 width) */}
        <div className="lg:col-span-2 bg-[#121829] border border-[#1e2a45] rounded-xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2a45]">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-base text-white">Filtered Severity Distribution</h3>
            </div>
            <span className="text-xs font-mono text-slate-300">{totalFilteredCount} MATCHES</span>
          </div>

          {totalFilteredCount === 0 ? (
            <div className="py-12 text-center bg-[#090d16] border border-[#1e2a45] rounded-xl flex flex-col items-center justify-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div className="text-sm font-semibold text-white">No Incidents Matching Selected Filters</div>
              <p className="text-xs text-slate-400 max-w-sm">
                Try selecting a broader time range, category, or zone filter above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Critical Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    CRITICAL SEVERITY
                  </span>
                  <span className="text-white font-bold">{criticalCount} incidents ({criticalPct}%)</span>
                </div>
                <div className="w-full bg-[#090d16] h-3 rounded-full overflow-hidden border border-[#1e2a45]">
                  <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${criticalPct}%` }} />
                </div>
              </div>

              {/* High Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-orange-400 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    HIGH SEVERITY
                  </span>
                  <span className="text-white font-bold">{highCount} incidents ({highPct}%)</span>
                </div>
                <div className="w-full bg-[#090d16] h-3 rounded-full overflow-hidden border border-[#1e2a45]">
                  <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${highPct}%` }} />
                </div>
              </div>

              {/* Medium Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-yellow-400 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    MEDIUM SEVERITY
                  </span>
                  <span className="text-white font-bold">{mediumCount} incidents ({mediumPct}%)</span>
                </div>
                <div className="w-full bg-[#090d16] h-3 rounded-full overflow-hidden border border-[#1e2a45]">
                  <div className="bg-yellow-500 h-full transition-all duration-300" style={{ width: `${mediumPct}%` }} />
                </div>
              </div>

              {/* Low Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    LOW SEVERITY
                  </span>
                  <span className="text-white font-bold">{lowCount} incidents ({lowPct}%)</span>
                </div>
                <div className="w-full bg-[#090d16] h-3 rounded-full overflow-hidden border border-[#1e2a45]">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${lowPct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Restricted Zone Breakdown (1/3 width) */}
        <div className="bg-[#121829] border border-[#1e2a45] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2a45]">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-base text-white">Zone Breakdown</h3>
            </div>
            <span className="text-xs font-mono text-slate-300">{sortedZones.length} BREACHED ZONES</span>
          </div>

          {sortedZones.length === 0 ? (
            <div className="py-8 text-center bg-[#090d16] border border-[#1e2a45] rounded-xl text-xs text-slate-400">
              No breaches matching current filter selection.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {sortedZones.map((z, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#090d16] border border-[#1e2a45] rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-white truncate max-w-[140px]">{z.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{z.count} incident(s)</div>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${
                      z.severity === 'Critical'
                        ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                        : z.severity === 'High'
                        ? 'bg-orange-950/80 text-orange-400 border-orange-800'
                        : z.severity === 'Medium'
                        ? 'bg-yellow-950/80 text-yellow-400 border-yellow-800'
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {z.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FILTERED INCIDENTS EVIDENCE LIST */}
      <div className="bg-[#121829] border border-[#1e2a45] rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2a45]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-base text-white">Filtered Security Incident Log</h3>
          </div>
          <span className="text-xs font-mono text-slate-300">REAL EVIDENCE RECORDS ({totalFilteredCount})</span>
        </div>

        {totalFilteredCount === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            No incidents recorded for this filter configuration.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.map((inc) => {
              const isCritical = inc.zoneSeverity === 'Critical';
              const isHigh = inc.zoneSeverity === 'High';
              const isMedium = inc.zoneSeverity === 'Medium';

              const badgeColor = isCritical
                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                : isHigh
                ? 'bg-orange-950/80 text-orange-400 border-orange-800'
                : isMedium
                ? 'bg-yellow-950/80 text-yellow-400 border-yellow-800'
                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800';

              const isAck = inc.status === 'ACKNOWLEDGED';

              return (
                <div
                  key={inc.id}
                  className="bg-[#090d16] border border-[#1e2a45] rounded-lg p-3.5 space-y-3 hover:border-blue-500/50 transition-colors"
                >
                  {/* Incident header */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold font-mono uppercase ${badgeColor}`}>
                      {inc.zoneSeverity} SEVERITY
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {inc.displayTime || new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Snapshot image if present */}
                  {inc.snapshotUrl && (
                    <div className="relative w-full h-32 bg-black rounded-lg overflow-hidden border border-[#1e2a45]">
                      <img
                        src={inc.snapshotUrl}
                        alt="Incident Snapshot"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Incident Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-white font-bold">
                      <span className="truncate">{inc.zoneName}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                      <span>IDENTITY:</span>
                      <span className={inc.identityStatus === 'FACE_UNVERIFIED' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                        {inc.identityStatus === 'FACE_UNVERIFIED' ? 'FACE UNVERIFIED' : 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span>CAMERA:</span>
                      <span className="text-white">{inc.cameraName || 'CAM-01'}</span>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="pt-2 border-t border-[#1e2a45]/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      STATUS: {inc.status}
                    </span>
                    <button
                      onClick={() => handleToggleAcknowledge(inc)}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold transition-colors ${
                        isAck
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {isAck ? 'Mark Unread' : 'Acknowledge'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
