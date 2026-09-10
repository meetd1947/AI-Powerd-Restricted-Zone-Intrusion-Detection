import React from 'react';
import { NavTab } from '../types';
import { 
  LayoutDashboard, 
  Camera, 
  Target, 
  AlertTriangle, 
  BarChart3, 
  Settings 
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cameras', label: 'Live Cameras', icon: Camera },
    { id: 'zones', label: 'Zone Calibration', icon: Target },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#121722] border-r border-[#1f293d] flex flex-col justify-between select-none">
      <div className="py-4">
        <div className="px-4 pb-3 mb-2 border-b border-[#1f293d]/50">
          <p className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
            Command Navigation
          </p>
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2233]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-[#1e2a45] text-xs text-slate-400 font-mono">
        <div className="flex items-center justify-between">
          <span>PIPELINE:</span>
          <span className="text-emerald-400 font-bold">ACTIVE</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span>AI ENGINE:</span>
          <span className="text-blue-400 font-bold">READY</span>
        </div>
      </div>
    </aside>
  );
};
