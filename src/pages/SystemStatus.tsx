import React from 'react';
import { Cpu, CheckCircle2, XCircle } from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const statuses = [
    { module: 'Application Shell', status: 'READY', ready: true },
    { module: 'AI Model Engine (COCO-SSD)', status: 'NOT INITIALIZED', ready: false },
    { module: 'Camera Video Pipeline', status: 'NOT INITIALIZED', ready: false },
    { module: 'Firebase Integration', status: 'NOT INITIALIZED', ready: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide">System & Pipeline Diagnostics</h2>
        <p className="text-sm text-slate-400">Real-time status of underlying AI, vision, and database services</p>
      </div>

      <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-[#1f293d] mb-4">
          <Cpu className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-base text-slate-200">Module Status Summary</h3>
        </div>

        <div className="space-y-3 font-mono">
          {statuses.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[#0a0d14] rounded-lg border border-[#1f293d]">
              <span className="text-sm text-slate-300 font-medium">{item.module}</span>
              <div className="flex items-center gap-2">
                {item.ready ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">{item.status}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500">{item.status}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
