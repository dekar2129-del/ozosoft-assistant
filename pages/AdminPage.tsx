import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/AdminDashboard';
import { LoginModal } from '../components/LoginModal';
import { CompanyConfig, DEFAULT_CONFIG } from '../types';
import { loadConfig, saveConfig } from '../utils/storageUtils';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<CompanyConfig>(DEFAULT_CONFIG);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);

  useEffect(() => {
    loadConfig().then((loadedConfig) => {
      setConfig(loadedConfig);
    });
  }, []);

  const handleSaveConfig = async (newConfig: CompanyConfig) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => navigate('/')}
          onLogin={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white overflow-hidden flex flex-col font-inter">
      <header className="px-8 py-6 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm flex justify-between items-center z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <i className="fas fa-wave-square text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight">OZOSOFT Assistant - Admin Panel</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden h-[calc(100vh-80px)]">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AdminDashboard 
            initialConfig={config} 
            onSave={handleSaveConfig} 
            onCancel={handleCancel}
            onLogout={handleLogout}
          />
        </div>
      </main>
    </div>
  );
};
