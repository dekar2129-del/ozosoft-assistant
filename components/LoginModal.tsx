import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded credentials for demonstration
    if (username === 'admin' && password === 'password') {
      setError('');
      onLogin();
      setUsername('');
      setPassword('');
    } else {
      setError('Invalid credentials. Try admin / password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-lock text-sky-500 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-white">Admin Login</h2>
          <p className="text-slate-400 text-sm mt-2">Access company knowledge base configuration.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-500">
                <i className="fas fa-user"></i>
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter username"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-500">
                <i className="fas fa-key"></i>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center justify-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-sky-900/50 transition-all active:scale-95 mt-2"
          >
            Authenticate
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">Hint: Use <span className="font-mono text-slate-400">admin</span> / <span className="font-mono text-slate-400">password</span></p>
        </div>
      </div>
    </div>
  );
};