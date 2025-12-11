import React, { useState } from 'react';
import { CompanyConfig } from '../types';
import { ConversationsPanel } from './ConversationsPanel';

interface AdminDashboardProps {
  initialConfig: CompanyConfig;
  onSave: (config: CompanyConfig) => Promise<void> | void;
  onCancel: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialConfig, onSave, onCancel, onLogout }) => {
  const [formData, setFormData] = useState<CompanyConfig>(initialConfig);
  const [showSaved, setShowSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'conversations'>('config');

  const handleChange = (field: keyof CompanyConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <i className="fas fa-shield-alt text-sky-500"></i>
            Admin Console
          </h2>
          <p className="text-slate-400 mt-2">Manage the AI's persona and company knowledge base.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
            onClick={onCancel} 
            className="text-slate-400 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
            title="Return to Assistant without logging out"
            >
            <i className="fas fa-arrow-left"></i>
            Back
            </button>
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            <button 
            onClick={onLogout} 
            className="text-red-400 hover:text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-2"
            >
            <i className="fas fa-sign-out-alt"></i>
            Logout
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'config'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-cog mr-2"></i>
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'conversations'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-comments mr-2"></i>
          Chat History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' ? (      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Identity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Identity</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Technology"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Tone of Voice</label>
                <input
                  type="text"
                  value={formData.tone}
                  onChange={(e) => handleChange('tone', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Professional, Friendly"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Knowledge Base */}
        <div className="lg:col-span-2">
           <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2 flex justify-between items-center">
                <span>Knowledge Base</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-900 px-2 py-1 rounded">Markdown Supported</span>
              </h3>
              
              <div className="flex-1 min-h-[400px]">
                <textarea
                  value={formData.knowledgeBase}
                  onChange={(e) => handleChange('knowledgeBase', e.target.value)}
                  className="w-full h-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white font-mono text-sm leading-relaxed focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none transition-all"
                  placeholder="Enter the specific facts, pricing, and details the AI should know..."
                />
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-700 pt-6">
                <button 
                   onClick={() => setFormData(initialConfig)}
                   className="text-slate-400 hover:text-red-400 text-sm font-medium transition-colors"
                >
                  Reset Changes
                </button>
                <div className="flex items-center gap-4">
                   {showSaved && (
                     <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-in fade-in slide-in-from-right-2">
                       <i className="fas fa-check-circle"></i> Saved!
                     </div>
                   )}
                   <button 
                     onClick={handleSave}
                     disabled={isSaving}
                     className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-sky-900/50 hover:shadow-sky-500/30 transition-all active:scale-95 flex items-center gap-2"
                   >
                     {isSaving ? (
                       <i className="fas fa-circle-notch fa-spin"></i>
                     ) : (
                       <i className="fas fa-save"></i>
                     )}
                     {isSaving ? 'Saving...' : 'Save Knowledge Base'}
                   </button>
                </div>
              </div>
           </div>
        </div>
      </div>
      ) : (
        <ConversationsPanel />
      )}
    </div>
  );
};