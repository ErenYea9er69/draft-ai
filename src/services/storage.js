/**
 * Local Storage Service
 * Save and load past analyses
 */

const STORAGE_KEY = 'startup_validator_history';
const KEYS_STORAGE = 'startup_validator_keys';

/**
 * Save an analysis result
 */
export function saveAnalysis(idea, result, tavilyResults) {
    const history = getHistory();
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        idea: idea.substring(0, 100),
        fullIdea: idea,
        timestamp: new Date().toISOString(),
        result,
        tavilyResults,
        verdict: result?.phases?.scorecard?.verdict || 'Unknown',
        overallScore: result?.phases?.scorecard?.overall_score || 0,
    };
    history.unshift(entry);
    // Keep max 20 entries
    if (history.length > 20) history.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return entry;
}

/**
 * Get all saved analyses
 */
export function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Delete an analysis by ID
 */
export function deleteAnalysis(id) {
    const history = getHistory().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Get a single analysis by ID
 */
export function getAnalysis(id) {
    return getHistory().find(h => h.id === id) || null;
}

/**
 * Save API keys (encrypted would be better in production)
 */
export function saveKeys(longcatKey, tavilyKey) {
    localStorage.setItem(KEYS_STORAGE, JSON.stringify({ longcatKey, tavilyKey }));
}

/**
 * Load API keys, falling back to environment variables
 */
export function loadKeys() {
    let keys = {};
    try {
        keys = JSON.parse(localStorage.getItem(KEYS_STORAGE) || '{}');
    } catch {
        keys = {};
    }

    // Fallback to .env variables if not provided
    if (!keys.longcatKey && import.meta.env.VITE_LONGCAT_API_KEY) {
        keys.longcatKey = import.meta.env.VITE_LONGCAT_API_KEY;
    }
    if (!keys.tavilyKey && import.meta.env.VITE_TAVILY_API_KEY) {
        keys.tavilyKey = import.meta.env.VITE_TAVILY_API_KEY;
    }

    return keys;
}
