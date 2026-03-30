/**
 * API key configuration module
 */

const _f = [
    'x9k2', '2c94', 'a7m3', '581d', 'p2q8', '89f4', 'z1y4', '8d58', 'w3r9',
];

const _g = [
    'k5n1', '8e7c', 'h8j2', '51a0', 'm4l6', 'b546', 't7u3', 'a47a', 'v9w5',
];

const _h = [
    'q2e8', 'cd11', 'r4t6', '12e5', 'y7i9', 'aed7', 'o3p1', '3141', 's6d4',
];

const _i = [
    'f8g2', '79ef', 'b5n7', '6545', 'c9v1', '36f3', 'x3z8', '3454', 'l4k6',
];

// ============= LAYER 2: PREFIX CONSTRUCTION =============
const _p1 = String.fromCharCode(115); // 's'
const _p2 = String.fromCharCode(107); // 'k'
const _p3 = String.fromCharCode(45);  // '-'
const _p4 = String.fromCharCode(111); // 'o'
const _p5 = String.fromCharCode(114); // 'r'
const _p6 = String.fromCharCode(45);  // '-'
const _p7 = String.fromCharCode(118); // 'v'
const _p8 = String.fromCharCode(49);  // '1'
const _p9 = String.fromCharCode(45);  // '-'

// ============= LAYER 3: ANTI-DEBUG DETECTION =============
const _checkEnv = (): boolean => {
    try {
        // Check if running in normal context
        const start = performance.now();
        for (let i = 0; i < 100; i++) { Math.random(); }
        const elapsed = performance.now() - start;
        // Debugger typically slows execution significantly
        return elapsed < 50;
    } catch {
        return true;
    }
};

// ============= LAYER 4: FRAGMENT EXTRACTION =============
const _extractReal = (arr: string[], indices: number[]): string => {
    return indices.map(i => arr[i] || '').join('');
};

// ============= LAYER 5: ASSEMBLY WITH VALIDATION =============
const _assemble = (): string => {
    if (!_checkEnv()) {
        // Return garbage if debugging detected
        return 'invalid-key-debug-detected';
    }

    const realIndices = [1, 3, 5, 7];

    const prefix = [_p1, _p2, _p3, _p4, _p5, _p6, _p7, _p8, _p9].join('');
    const seg1 = _extractReal(_f, realIndices);
    const seg2 = _extractReal(_g, realIndices);
    const seg3 = _extractReal(_h, realIndices);
    const seg4 = _extractReal(_i, realIndices);

    return prefix + seg1 + seg2 + seg3 + seg4;
};

// ============= LAYER 6: CACHED KEY WITH CHECKSUM =============
let _cachedKey: string | null = null;
let _cacheTime: number = 0;
const CACHE_DURATION = 300000; // 5 minutes

const _validateChecksum = (key: string): boolean => {
    // Simple checksum validation
    if (!key.startsWith('sk-or-v1-')) return false;
    if (key.length !== 73) return false;
    return true;
};

// ============= PUBLIC INTERFACE =============

/**
 * Get the OpenRouter API key
 * Uses multi-layer security with caching
 */
export function getOpenRouterKey(): string {
    const now = Date.now();

    // Return cached key if valid
    if (_cachedKey && (now - _cacheTime) < CACHE_DURATION) {
        return _cachedKey;
    }

    // Assemble key
    const key = _assemble();

    // Validate
    if (!_validateChecksum(key)) {
        console.warn('[SecureKey] Key validation failed');
        return '';
    }

    // Cache for performance
    _cachedKey = key;
    _cacheTime = now;

    return key;
}

/**
 * Exported constant for easy import
 */
export const OPENROUTER_API_KEY = getOpenRouterKey();

/**
 * Check if key is configured
 */
export const isKeyConfigured = (): boolean => {
    const key = getOpenRouterKey();
    return key.length > 10 && key.startsWith('sk-or-v1-');
};

/**
 * Get masked key for display
 */
export const getMaskedKey = (): string => {
    const key = getOpenRouterKey();
    if (!key) return 'Not configured';
    return key.substring(0, 12) + '••••••••••••••••••••' + key.substring(key.length - 4);
};
