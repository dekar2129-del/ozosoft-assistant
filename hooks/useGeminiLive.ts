import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { ConnectionState, CompanyConfig, TranscriptionItem } from '../types';
import { createPcmBlob, decodeBase64, pcmToAudioBuffer, downsampleBuffer } from '../utils/audioUtils';

export const useGeminiLive = (config: CompanyConfig) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  
  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const currentConfigRef = useRef<CompanyConfig>(config);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Track connection state in ref for access inside callbacks
  const connectionStateRef = useRef<ConnectionState>(ConnectionState.DISCONNECTED);

  // Update ref when config changes so the next connection uses it
  useEffect(() => {
    currentConfigRef.current = config;
  }, [config]);

  // Sync state to ref
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  // Audio Visualization Loop
  useEffect(() => {
    let animationFrameId: number;
    const updateVolume = () => {
      if (analyserRef.current && connectionStateRef.current === ConnectionState.CONNECTED) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(avg);
      } else {
        setVolume(0);
      }
      animationFrameId = requestAnimationFrame(updateVolume);
    };
    updateVolume();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const cleanup = useCallback(async () => {
    // IMMEDIATE STATE SYNC to prevent race conditions
    connectionStateRef.current = ConnectionState.DISCONNECTED; 

    // 0. Close the Session explicitly
    if (sessionRef.current) {
        const currentSessionPromise = sessionRef.current;
        sessionRef.current = null; // Prevent re-entry
        currentSessionPromise.then(session => {
            try { 
                // Attempt to close if the method exists
                if (session && typeof session.close === 'function') {
                    session.close(); 
                }
            } catch(e) { 
                console.debug("Session close error (harmless)", e); 
            }
        }).catch(() => { /* ignore promise rejections during cleanup */ });
    }

    // 1. Stop the media stream tracks (Microphone)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 2. Disconnect and stop the source node (Audio Input)
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    // 3. Disconnect the processor (Stop 'onaudioprocess')
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // 4. Close AudioContexts
    if (inputAudioContextRef.current) {
      try { await inputAudioContextRef.current.close(); } catch (e) {}
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      try { await outputAudioContextRef.current.close(); } catch (e) {}
      outputAudioContextRef.current = null;
    }

    // 5. Stop all playing output sources
    sourceNodesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourceNodesRef.current.clear();
  }, []);

  const disconnect = useCallback(async () => {
    // Sync ref immediately before async cleanup
    connectionStateRef.current = ConnectionState.DISCONNECTED;
    await cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
    setError(null);
  }, [cleanup]);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY || process.env.API_KEY === 'PLACEHOLDER_API_KEY') {
      const msg = process.env.API_KEY === 'PLACEHOLDER_API_KEY' 
        ? "Please set a valid GEMINI_API_KEY in .env.local file" 
        : "API Key is missing in environment variables.";
      alert(msg);
      setError(msg);
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    // Reset state
    connectionStateRef.current = ConnectionState.CONNECTING;
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    try {
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Ensure the output context is running
      if (outputAudioContextRef.current.state === 'suspended') {
        await outputAudioContextRef.current.resume();
      }

      // Setup Analyser for visualizer
      analyserRef.current = inputAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      // Get Microphone Stream
      let stream: MediaStream;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone access is not supported");
        }
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
      } catch (err: any) {
        console.warn("Microphone access failed. Falling back to silent stream.", err);
        const dest = inputAudioContextRef.current.createMediaStreamDestination();
        stream = dest.stream;
        if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
             setError("Microphone not found or blocked. Using silent mode.");
        }
      }
      
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY.trim() });
      
      const configToUse = currentConfigRef.current;
      const systemInstruction = `
        You are a voice assistant for a company called ${configToUse.name}.
        Industry: ${configToUse.industry}.
        Tone: ${configToUse.tone}.
        
        IMPORTANT - CONVERSATION START PROTOCOL:
        At the very beginning of every conversation, you MUST:
        1. Greet the user warmly
        2. Ask for their name
        3. After they provide their name, ask for their phone number
        4. Acknowledge and thank them for providing their contact information
        5. Then proceed to assist them with their needs
        
        Example opening:
        "Hello! Welcome to ${configToUse.name}. I'm your AI assistant. May I have your name please?"
        [Wait for response]
        "Thank you [Name]! And could you please provide your phone number so we can better assist you?"
        [Wait for response]
        "Perfect, thank you! How can I help you today?"
        
        Company Knowledge Base:
        ${configToUse.knowledgeBase}
        
        Keep your responses relatively brief as this is a voice conversation.
        If the user asks something outside your knowledge base, politely explain you only know about ${configToUse.name}.
      `;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
             // CRITICAL GUARD: If user disconnected while connecting, abort immediately.
             if (connectionStateRef.current === ConnectionState.DISCONNECTED) {
                 console.log("Session opened but user disconnected. Aborting.");
                 return;
             }

            console.log("Session opened");
            setConnectionState(ConnectionState.CONNECTED);
            connectionStateRef.current = ConnectionState.CONNECTED;
            
            // Send initial greeting message
            sessionRef.current?.then((session: any) => {
              const greetingMessage = `Hello! Welcome to ${configToUse.name}. I'm Akanksha, your AI assistant. May I have your name, please?`;
              session.sendText(greetingMessage);
              console.log("Sent initial greeting");
            }).catch((err: any) => {
              console.error("Failed to send greeting:", err);
            });
            
            if (!inputAudioContextRef.current || !streamRef.current) return;

            // Setup Input Processing
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            mediaStreamSourceRef.current = source;

            // Use 4096 buffer size for standard latency/stability balance
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            source.connect(analyserRef.current!);
            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            const sourceSampleRate = inputAudioContextRef.current.sampleRate;
            const targetSampleRate = 16000;

            processor.onaudioprocess = (e) => {
              // STRICT GUARD: Only process if connected
              if (connectionStateRef.current !== ConnectionState.CONNECTED) return;

              const inputData = e.inputBuffer.getChannelData(0);
              const downsampledData = downsampleBuffer(inputData, sourceSampleRate, targetSampleRate);
              const pcmBlob = createPcmBlob(downsampledData, targetSampleRate);
              
              sessionPromise.then(session => {
                // RE-CHECK state inside the promise resolution to prevent race condition
                // Added strict check for session existence
                if (connectionStateRef.current === ConnectionState.CONNECTED && session) {
                   session.sendRealtimeInput({ media: pcmBlob }).catch((e: any) => {
                       // Swallow network errors if we are already disconnecting
                       if (connectionStateRef.current === ConnectionState.CONNECTED) {
                           console.debug("Send error:", e);
                       }
                   });
                }
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            const { serverContent } = message;
            if (!serverContent) return;

            // Handle Transcriptions
            if (serverContent.inputTranscription?.text) {
               setTranscriptions(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.sender === 'user' && !last.isComplete) {
                   return [...prev.slice(0, -1), { ...last, text: last.text + serverContent.inputTranscription.text }];
                 }
                 return [...prev, {
                   text: serverContent.inputTranscription.text,
                   sender: 'user',
                   timestamp: Date.now(),
                   isComplete: false
                 }];
               });
            }

            if (serverContent.outputTranscription?.text) {
               setTranscriptions(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.sender === 'model' && !last.isComplete) {
                   return [...prev.slice(0, -1), { ...last, text: last.text + serverContent.outputTranscription.text }];
                 }
                 return [...prev, {
                   text: serverContent.outputTranscription.text,
                   sender: 'model',
                   timestamp: Date.now(),
                   isComplete: false
                 }];
               });
            }

            if (serverContent.turnComplete) {
               setTranscriptions(prev => {
                 const last = prev[prev.length - 1];
                 if (last && !last.isComplete) {
                    return [...prev.slice(0, -1), { ...last, isComplete: true }];
                 }
                 return prev;
               });
            }

            // Handle Audio Output
            const audioData = serverContent.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              if (ctx.state === 'suspended') {
                 await ctx.resume();
              }

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              try {
                const audioBuffer = await pcmToAudioBuffer(
                  decodeBase64(audioData), 
                  ctx
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => sourceNodesRef.current.delete(source);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourceNodesRef.current.add(source);
              } catch (e) {
                console.error("Failed to decode audio", e);
              }
            }

            if (serverContent.interrupted) {
              sourceNodesRef.current.forEach(node => {
                 try { node.stop(); } catch(e) {}
              });
              sourceNodesRef.current.clear();
              nextStartTimeRef.current = 0;
              
              setTranscriptions(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.sender === 'model' && !last.isComplete) {
                    return [...prev.slice(0, -1), { ...last, isComplete: true, text: last.text + "..." }];
                 }
                 return prev;
               });
            }
          },
          onclose: () => {
            console.log("Session closed");
            connectionStateRef.current = ConnectionState.DISCONNECTED;
            setConnectionState(ConnectionState.DISCONNECTED);
            cleanup();
          },
          onerror: (err: any) => {
            console.error("Session error caught", err);
            connectionStateRef.current = ConnectionState.ERROR;
            setConnectionState(ConnectionState.ERROR);
            
            let message = "Connection failed.";
            if (err instanceof Error) {
               message = err.message;
            } else if (err?.message) {
               message = err.message;
            }
            
            setError(message);
            cleanup();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      connectionStateRef.current = ConnectionState.ERROR;
      setConnectionState(ConnectionState.ERROR);
      setError(e.message || "Connection failed");
      cleanup();
    }
  }, [config, disconnect, cleanup]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (sessionRef.current && connectionStateRef.current === ConnectionState.CONNECTED) {
      try {
        const session = await sessionRef.current;
        
        // Safety check if session is undefined
        if (!session) {
            console.warn("Session is undefined, cannot send message");
            return;
        }

        await session.sendRealtimeInput({
            clientContent: {
                turns: [{
                    parts: [{ text }],
                    role: 'user'
                }],
                turnComplete: true
            }
        });
        
        setTranscriptions(prev => [...prev, {
          text: text,
          sender: 'user',
          timestamp: Date.now(),
          isComplete: true
        }]);
      } catch (err) {
        console.error("Failed to send text message", err);
      }
    }
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    sendTextMessage,
    volume,
    transcriptions,
    error
  };
};