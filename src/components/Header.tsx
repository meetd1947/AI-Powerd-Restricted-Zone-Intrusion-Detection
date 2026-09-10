import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Camera, Activity, Clock, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStoredIncidents, subscribeToIncidentsFromFirestore } from '../services/incidentService';

export const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [incidentCount, setIncidentCount] = useState<number>(0);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stored = getStoredIncidents();
    setIncidentCount(stored.length);

    const unsubscribe = subscribeToIncidentsFromFirestore(
      (incidents) => {
        if (incidents.length > 0) setIncidentCount(incidents.length);
      },
      () => {}
    );
    return () => unsubscribe();
  }, []);

  return (
    <header className="h-16 bg-[#121829] border-b border-[#1e2a45] px-6 flex items-center justify-between select-none">
      {/* Branding */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-wide uppercase font-mono">STADIUM MONITORING</h1>
            <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800 font-mono font-semibold">LIVE</span>
          </div>
          <p className="text-xs text-slate-300 font-mono">Restricted-Zone Intrusion Surveillance</p>
        </div>
      </div>

      {/* System Quick Metrics & Status */}
      <div className="flex items-center gap-6 text-sm font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090d16] rounded-md border border-[#1e2a45]">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 text-xs">SYSTEM:</span>
          <span className="text-emerald-400 font-semibold text-xs tracking-wider">ONLINE</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090d16] rounded-md border border-[#1e2a45]">
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300 text-xs">CAMERAS:</span>
          <span className="text-white font-semibold text-xs font-mono">1/1 ONLINE</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090d16] rounded-md border border-[#1e2a45]">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-slate-300 text-xs">INCIDENTS:</span>
          <span className="text-white font-semibold text-xs font-mono">{incidentCount} LOGGED</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#090d16] rounded-md border border-[#1e2a45] min-w-[100px] justify-center">
          <Clock className="w-4 h-4 text-slate-300" />
          <span className="text-white text-xs font-mono">{currentTime || '--:--:--'}</span>
        </div>

        {/* Operator Badge & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#1e2a45]">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="text-slate-200 font-medium truncate max-w-[120px]">{user?.email || 'SecOps Controller'}</div>
            <div className="text-slate-500 font-mono text-[10px]">Stadium SOC Alpha</div>
          </div>
          {user && (
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="ml-2 p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/40 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

