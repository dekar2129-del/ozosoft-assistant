import { CompanyConfig, DEFAULT_CONFIG } from '../types';

const STORAGE_KEY = 'ozosoft_config_v1';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/config';

/**
 * Loads configuration from the Backend API.
 * Falls back to LocalStorage, then Default Config if API is unavailable.
 */
export const loadConfig = async (): Promise<CompanyConfig> => {
  // 1. Try API
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      // Validate minimal fields exist
      if (data.name && data.industry) {
        // Cache successful fetch to local storage for offline use
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (error) {
    console.warn("Backend API unavailable. Falling back to local storage.", error);
  }

  // 2. Fallback to LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to parse local storage config.", error);
  }

  // 3. Fallback to Defaults
  return DEFAULT_CONFIG;
};

/**
 * Saves configuration to the Backend API.
 * Also updates LocalStorage for redundancy.
 */
export const saveConfig = async (config: CompanyConfig): Promise<boolean> => {
  // Always save to local storage first for immediate UI consistency
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Local save failed", e);
  }

  // Try saving to API
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to save to Backend API.", error);
    return false; // Return false to indicate partial success (local only)
  }
};