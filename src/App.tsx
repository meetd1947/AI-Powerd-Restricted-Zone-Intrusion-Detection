import React, { useState } from 'react';
import { NavTab } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { LiveCameras } from './pages/LiveCameras';
import { ZoneCalibration } from './pages/ZoneCalibration';
import { Incidents } from './pages/Incidents';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import { Shield, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-300">
        <div className="p-4 bg-[#121829] border border-[#1e2a45] rounded-2xl flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500 animate-pulse" />
          <div className="flex items-center gap-2 text-sm font-mono text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>INITIALIZING SECURITY CONSOLE...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateToCameras={() => setActiveTab('cameras')}
            onNavigateToIncidents={() => setActiveTab('incidents')}
          />
        );
      case 'cameras':
        return <LiveCameras />;
      case 'zones':
        return <ZoneCalibration />;
      case 'incidents':
        return <Incidents />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard
            onNavigateToCameras={() => setActiveTab('cameras')}
            onNavigateToIncidents={() => setActiveTab('incidents')}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100 font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#090d16]">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};


export default App;
