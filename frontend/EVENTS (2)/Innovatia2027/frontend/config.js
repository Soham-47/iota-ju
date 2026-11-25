/**
 * Central configuration for Innovatia 2026 Registration Portal
 * Location: frontend/EVENTS (2)/Innovatia2026/frontend/config.js
 *
 * Loads environment variables from .env (with safe local/runtime fallbacks)
 * Connects directly to Supabase without requiring a separate backend server.
 */

const API_CONFIG = {
    // Default fallback configurations
    SUPABASE_URL: "https://sndmziujhdylwxtbmkyl.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_MuWOqIoA84vAXkPizVCMew_TMZkYGww",
    TABLE_NAME: "innovatia_2026_registrations",
    STORAGE_BUCKET: "payment-receipts",

    get REST_ENDPOINT() {
        return `${this.SUPABASE_URL}/rest/v1/${this.TABLE_NAME}`;
    },

    // Promise that resolves once .env is fetched and parsed
    ready: null
};

/**
 * Parse standard .env text into a key-value object
 */
function parseEnvText(text) {
    const env = {};
    if (!text) return env;
    const lines = text.split(/\r?\n/);
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;
        const equalIdx = line.indexOf("=");
        if (equalIdx > 0) {
            const key = line.substring(0, equalIdx).trim();
            let val = line.substring(equalIdx + 1).trim();
            // Remove wrapping quotes and extra whitespace if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1).trim();
            }
            env[key] = val;
        }
    }
    return env;
}

/**
 * Asynchronously load environment variables from window.__ENV__ or .env file
 */
API_CONFIG.ready = (async function loadEnv() {
    // 1. If preloaded via an env script (e.g. window.__ENV__)
    if (typeof window !== "undefined" && window.__ENV__) {
        Object.assign(API_CONFIG, window.__ENV__);
        return API_CONFIG;
    }

    // 2. Attempt fetching local .env file
    try {
        const response = await fetch(".env");
        if (response.ok) {
            const text = await response.text();
            const parsed = parseEnvText(text);
            if (parsed.SUPABASE_URL) API_CONFIG.SUPABASE_URL = parsed.SUPABASE_URL.trim();
            if (parsed.SUPABASE_ANON_KEY) API_CONFIG.SUPABASE_ANON_KEY = parsed.SUPABASE_ANON_KEY.trim();
            if (parsed.TABLE_NAME) API_CONFIG.TABLE_NAME = parsed.TABLE_NAME.trim();
            if (parsed.STORAGE_BUCKET) API_CONFIG.STORAGE_BUCKET = parsed.STORAGE_BUCKET.trim();
        }
    } catch (e) {
        // Fallback cleanly when served under protocols restricting local fetch (e.g. file://)
    }

    return API_CONFIG;
})();
