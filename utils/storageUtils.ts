import { CompanyConfig, DEFAULT_CONFIG } from '../types';

const STORAGE_KEY = 'ozosoft_config_v1';
const API_URL = import.meta.env.VITE_API_URL || '/api/config';

/**
 * Loads configuration from the Backend API.
 * Falls back to LocalStorage, then Default Config if API is unavailable.
 */
export const loadConfig = async (): Promise<CompanyConfig> => {
  // 1. Try API
  try {
    const response = await fetch(API_URL);
    
    // Handle successful response (200 OK)
    if (response.ok) {
      const data = await response.json();
      // Validate minimal fields exist
      if (data.name && data.industry) {
        // Cache successful fetch to local storage for offline use
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
    
    // Handle 503 (Service Unavailable) - MongoDB disconnected
    if (response.status === 503) {
      const errorData = await response.json().catch(() => ({}));
      // Only log once per session to avoid console spam
      if (!sessionStorage.getItem('db_warning_shown')) {
        console.info("ℹ️ Database connection unavailable. Using local storage. App will continue to work normally.");
        sessionStorage.setItem('db_warning_shown', 'true');
      }
      // Continue to fallback below
    }
    // Handle 404 (Not Found) - No config in database
    else if (response.status === 404) {
      // Silent - this is expected when no config exists yet
      // Continue to fallback below
    }
    // Handle other errors
    else {
      // Only log unexpected errors
      if (response.status !== 503) {
        console.warn(`API returned status ${response.status}. Falling back to local storage.`);
      }
      // Continue to fallback below
    }
  } catch (error) {
    // Network errors - only log if not a known disconnection
    if (!(error instanceof TypeError && error.message.includes('Failed to fetch'))) {
      console.warn("Backend API unavailable. Falling back to local storage.", error);
    }
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

    if (response.ok) {
      return true;
    }
    
    // Handle 503 (Service Unavailable) - MongoDB disconnected
    if (response.status === 503) {
      // Silent - config is saved locally, will sync when DB reconnects
      return false; // Saved locally, but not to database
    }
    
    // Handle other errors
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server responded with ${response.status}`);
  } catch (error) {
    console.error("Failed to save to Backend API.", error);
    return false; // Return false to indicate partial success (local only)
  }
};