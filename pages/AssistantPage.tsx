import React, { useState, useRef, useEffect } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionState, CompanyConfig, DEFAULT_CONFIG } from '../types';
import { Visualizer } from '../components/Visualizer';
import { loadConfig } from '../utils/storageUtils';

export const AssistantPage: React.FC = () => {
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const { connectionState, connect, disconnect, sendTextMessage, volume, transcriptions, error } = useGeminiLive(config || DEFAULT_CONFIG);
  const transcriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfig().then((loadedConfig) => {
      setConfig(loadedConfig);
      setIsLoadingConfig(false);
    });
  }, []);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcriptions, connectionState]);

  // Save conversation when it ends or when new messages arrive
  useEffect(() => {
    if (transcriptions.length > 0) {
      const saveConversation = async () => {
        try {
          const baseUrl = '/api/conversations';
          await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              messages: transcriptions,
              endedAt: connectionState === ConnectionState.DISCONNECTED ? new Date() : null
            })
          });
          console.log('Conversation saved successfully');
        } catch (err) {
          console.error('Failed to save conversation:', err);
        }
      };

      // Debounce saving
      const timeout = setTimeout(saveConversation, 2000);
      return () => clearTimeout(timeout);
    }
  }, [transcriptions, sessionId, connectionState]);

  const handleDisconnect = async () => {
    // Save final conversation before disconnecting
    if (transcriptions.length > 0) {
      try {
        const baseUrl = '/api/conversations';
        await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messages: transcriptions,
            endedAt: new Date()
          })
        });
        console.log('Final conversation saved');
      } catch (err) {
        console.error('Failed to save final conversation:', err);
      }
    }
    disconnect();
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputText.trim() && connectionState === ConnectionState.CONNECTED) {
      sendTextMessage(inputText);
      setInputText('');
    }
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const isError = connectionState === ConnectionState.ERROR;

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white overflow-hidden flex flex-col font-inter">
      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm flex justify-between items-center z-10 sticky top-0 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <i className="fas fa-wave-square text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight">OZOSOFT Assistant</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              isConnecting ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                isError ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-slate-700 text-slate-400'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' :
                isConnecting ? 'bg-yellow-500 animate-bounce' :
                  isError ? 'bg-red-500' :
                    'bg-slate-500'
              }`} />
            {connectionState === ConnectionState.DISCONNECTED ? 'Standby' : connectionState}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-[calc(100vh-80px)]">
        <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">

          {/* Top Section: Visualizer or Welcome Message */}
          <div className={`transition-all duration-500 ease-in-out ${isConnected ? 'h-32 shrink-0' : 'h-1/2 grow flex items-center justify-center'}`}>
            <div className="flex flex-col items-center justify-center h-full w-full p-4 relative">
              {!isConnected && (
                <div className="text-center mb-8 animate-in slide-in-from-bottom-4 fade-in duration-700">
                  <h3 className="text-3xl font-light text-slate-300 tracking-tight">
                    Talking with <span className="font-bold text-white drop-shadow-lg">
                      {isLoadingConfig ? '...' : (config.assistantName || config.name)}
                    </span>
                  </h3>
                  <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto leading-relaxed">
                    This voice assistant is configured with specific knowledge about {isLoadingConfig ? '...' : config.industry}.
                  </p>
                </div>
              )}

              {/* Visualizer scales down when connected/chatting */}
              <div className={`transition-all duration-500 ${isConnected ? 'scale-50' : 'scale-125'}`}>
                <Visualizer volume={volume} active={isConnected} />
              </div>
            </div>
          </div>

          {/* Middle Section: Scrollable Chat History */}
          <div className="flex-1 overflow-hidden relative w-full max-w-4xl mx-auto px-4">
            {isConnected ? (
              <div
                ref={transcriptionRef}
                className="h-full overflow-y-auto pr-2 space-y-4 pb-4 scroll-smooth scrollbar-hide"
              >
                {transcriptions.length === 0 && (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
                    Start speaking or type a message below...
                  </div>
                )}

                {transcriptions.map((t, i) => (
                  <div
                    key={t.timestamp + i}
                    className={`flex flex-col max-w-[85%] ${t.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider px-1">
                      {t.sender === 'user' ? 'You' : (config.assistantName || config.name)}
                    </span>
                    <div
                      className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${t.sender === 'user'
                          ? 'bg-sky-600 text-white rounded-tr-sm'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm'
                        }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Bottom Section: Controls & Input */}
          <div className="shrink-0 p-6 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 z-20">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">

              {isError && error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto w-fit mb-2">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              {/* Connection Control (Centered when not connected) */}
              {!isConnected ? (
                <div className="flex justify-center">
                  <button
                    onClick={connect}
                    disabled={isConnecting || isLoadingConfig}
                    className={`group relative flex items-center gap-4 px-10 py-4 rounded-full text-white font-semibold shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isError
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-900/40'
                        : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-900/40'
                      }`}
                  >
                    {isConnecting || isLoadingConfig ? (
                      <i className="fas fa-circle-notch fa-spin text-xl"></i>
                    ) : (
                      <i className={`fas ${isError ? 'fa-redo' : 'fa-microphone'} text-xl`}></i>
                    )}
                    <span className="text-lg">
                      {isLoadingConfig ? 'Loading Config...' : (isError ? 'Retry Connection' : 'Start Conversation')}
                    </span>
                  </button>
                </div>
              ) : (
                /* Connected Interface: Chat Input + Hangup */
                <div className="flex items-end gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-300">

                  {/* Hangup Button (Small) */}
                  <button
                    onClick={handleDisconnect}
                    className="h-12 w-12 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shrink-0"
                    title="End Call"
                  >
                    <i className="fas fa-phone-slash"></i>
                  </button>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-full py-3.5 pl-6 pr-14 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="absolute right-2 top-2 h-9 w-9 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95"
                    >
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
