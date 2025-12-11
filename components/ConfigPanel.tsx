import React from 'react';
import { CompanyConfig } from '../types';

interface ConfigPanelProps {
  config: CompanyConfig;
  setConfig: React.Dispatch<React.SetStateAction<CompanyConfig>>;
  disabled: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, disabled }) => {
  const handleChange = (field: keyof CompanyConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <i className="fas fa-building text-sky-400"></i>
        Company Context
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        Define the persona and knowledge base for the AI. This injects specific context into the model's system instructions.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Company Name</label>
          <input
            type="text"
            disabled={disabled}
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Industry</label>
          <input
            type="text"
            disabled={disabled}
            value={config.industry}
            onChange={(e) => handleChange('industry', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Tone of Voice</label>
          <input
            type="text"
            disabled={disabled}
            value={config.tone}
            onChange={(e) => handleChange('tone', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Knowledge Base</label>
          <textarea
            disabled={disabled}
            value={config.knowledgeBase}
            onChange={(e) => handleChange('knowledgeBase', e.target.value)}
            rows={10}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none resize-none text-sm leading-relaxed disabled:opacity-50"
            placeholder="Enter product details, pricing, history, etc..."
          />
        </div>
      </div>
    </div>
  );
};