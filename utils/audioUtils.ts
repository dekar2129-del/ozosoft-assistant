import { Blob } from "@google/genai";

/**
 * Encodes a Float32Array (from AudioBuffer) into a base64 string
 * representing 16-bit PCM data.
 */
export function base64EncodeAudio(float32Data: Float32Array): string {
  const int16Array = new Int16Array(float32Data.length);
  for (let i = 0; i < float32Data.length; i++) {
    // Clamp values to [-1, 1] and scale to 16-bit integer range
    let s = Math.max(-1, Math.min(1, float32Data[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  
  // Efficiently convert to string in chunks to avoid stack overflow or long blocking loops
  const CHUNK_SIZE = 0x8000; // 32KB
  const parts = [];
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    parts.push(String.fromCharCode.apply(null, Array.from(uint8Array.subarray(i, i + CHUNK_SIZE))));
  }
  return btoa(parts.join(''));
}

/**
 * Decodes a base64 string into a raw Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data (Uint8Array) into an AudioBuffer.
 * Gemini sends 16-bit PCM at 24kHz (usually).
 */
export async function pcmToAudioBuffer(
  data: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert int16 back to float32 [-1, 1]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Downsamples audio data from a source sample rate to a target sample rate.
 */
export function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, targetSampleRate: number): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return buffer;
  }
  
  if (inputSampleRate < targetSampleRate) {
    // console.warn("Upsampling is not supported in this utility. Returning original buffer.");
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const nextOriginalIndex = Math.floor((i + 1) * sampleRateRatio);
    let originalIndex = Math.floor(i * sampleRateRatio);
    let accum = 0;
    let count = 0;
    
    // Simple averaging (boxcar filter) for downsampling
    while (originalIndex < nextOriginalIndex && originalIndex < buffer.length) {
      accum += buffer[originalIndex];
      count++;
      originalIndex++;
    }
    
    result[i] = count > 0 ? accum / count : 0;
  }
  
  return result;
}

/**
 * Creates a Gemini-compatible Blob object from Float32Array input.
 */
export function createPcmBlob(data: Float32Array, sampleRate: number = 16000): Blob {
    return {
        data: base64EncodeAudio(data),
        mimeType: `audio/pcm;rate=${sampleRate}`,
    };
}