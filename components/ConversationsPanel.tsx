import React, { useState, useEffect } from 'react';

interface Message {
  text: string;
  sender: 'user' | 'model';
  timestamp: Date;
  isComplete?: boolean;
}

interface Conversation {
  _id: string;
  sessionId: string;
  clientName?: string;
  clientPhone?: string;
  messages: Message[];
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  messageCount: number;
}

export const ConversationsPanel: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching conversations from /api/conversations');
      const response = await fetch('/api/conversations', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Conversations data:', data);
      
      if (!data.conversations || !Array.isArray(data.conversations)) {
        throw new Error('Invalid response format: conversations array not found');
      }
      
      setConversations(data.conversations);
      setTotal(data.total || data.conversations.length);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setConversations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      console.log('Deleting conversation:', sessionId);
      const response = await fetch(`/api/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete failed:', error);
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
        return;
      }
      
      const result = await response.json();
      console.log('Delete successful:', result);
      
      fetchConversations();
      if (selectedConversation?.sessionId === sessionId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete conversation: ${errorMessage}`);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col items-center justify-center h-64">
          <i className="fas fa-spinner fa-spin text-4xl text-sky-500 mb-4"></i>
          <p className="text-slate-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col items-center justify-center h-64">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <p className="text-slate-300 mb-2">Failed to load conversations</p>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchConversations}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <i className="fas fa-redo"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <i className="fas fa-comments text-sky-500"></i>
          Chat History ({total})
        </h2>
        <button
          onClick={fetchConversations}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <i className="fas fa-inbox text-4xl mb-2"></i>
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedConversation?._id === conv._id
                    ? 'bg-sky-600/20 border-sky-500 border'
                    : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-slate-400">
                    {formatDate(conv.startedAt)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.sessionId);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                
                {/* Client Info */}
                {(conv.clientName || conv.clientPhone) && (
                  <div className="mb-2 pb-2 border-b border-slate-600">
                    {conv.clientName && (
                      <div className="text-sm font-semibold text-sky-400 flex items-center gap-1">
                        <i className="fas fa-user text-xs"></i>
                        {conv.clientName}
                      </div>
                    )}
                    {conv.clientPhone && (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <i className="fas fa-phone text-xs"></i>
                        {conv.clientPhone}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-sm text-slate-300">
                  {conv.messageCount} messages
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Duration: {formatDuration(conv.duration)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600">
              <div className="mb-4 pb-4 border-b border-slate-600">
                <h3 className="text-lg font-semibold mb-2">Conversation Details</h3>
                
                {/* Client Information */}
                {(selectedConversation.clientName || selectedConversation.clientPhone) && (
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fas fa-user-circle text-sky-400"></i>
                      <span className="font-semibold text-sky-300">Client Information</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedConversation.clientName && (
                        <div>
                          <span className="text-slate-400">Name:</span>{' '}
                          <span className="text-white font-medium">{selectedConversation.clientName}</span>
                        </div>
                      )}
                      {selectedConversation.clientPhone && (
                        <div>
                          <span className="text-slate-400">Phone:</span>{' '}
                          <span className="text-white font-medium">{selectedConversation.clientPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Started:</span>{' '}
                    <span className="text-white">{formatDate(selectedConversation.startedAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Duration:</span>{' '}
                    <span className="text-white">{formatDuration(selectedConversation.duration)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Messages:</span>{' '}
                    <span className="text-white">{selectedConversation.messageCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Session ID:</span>{' '}
                    <span className="text-white text-xs">{selectedConversation.sessionId.substring(0, 20)}...</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {selectedConversation.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className="text-xs text-slate-400 mb-1">
                        {msg.sender === 'user' ? 'User' : 'Assistant'}
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          msg.sender === 'user'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-600 text-slate-100'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600 h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <i className="fas fa-mouse-pointer text-4xl mb-2"></i>
                <p>Select a conversation to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
