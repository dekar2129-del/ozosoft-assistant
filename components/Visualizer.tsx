import React from 'react';

interface VisualizerProps {
  volume: number;
  active: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, active }) => {
  // Map 0-255 volume to scale factor
  const scale = active ? 1 + (volume / 50) : 1;
  const glow = active ? `0 0 ${volume / 2}px rgba(56, 189, 248, 0.6)` : 'none';
  const color = active ? '#38bdf8' : '#64748b'; // Sky-400 vs Slate-500

  return (
    <div className="relative flex items-center justify-center h-64 w-64">
      {/* Outer Pulse Rings */}
      {active && (
        <>
          <div className="absolute inset-0 rounded-full border border-sky-500/30 animate-[ping_3s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-sky-400/20 animate-[ping_2s_linear_infinite]" />
        </>
      )}
      
      {/* Core Orb */}
      <div 
        className="rounded-full shadow-2xl transition-all duration-75 ease-out"
        style={{
          width: '120px',
          height: '120px',
          backgroundColor: color,
          transform: `scale(${scale})`,
          boxShadow: glow,
          backgroundImage: active ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(56,189,248,0))' : undefined
        }}
      >
        {!active && (
          <div className="flex items-center justify-center h-full w-full text-slate-900 opacity-50">
            <i className="fas fa-microphone-slash text-3xl"></i>
          </div>
        )}
      </div>
    </div>
  );
};