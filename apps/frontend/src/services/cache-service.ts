// Cache Service para Frontend - Coordena com Redis Backend
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  enableLocalStorage: boolean;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 30000, // 30 seconds default
      maxEntries: 100,
      enableLocalStorage: true,
      ...config
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  // Get data from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Set data in cache
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, entry);

    // Persist to localStorage if enabled
    if (this.config.enableLocalStorage) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Failed to persist cache to localStorage:', error);
      }
    }
  }

  // Remove from cache
  delete(key: string): void {
    this.cache.delete(key);
    if (this.config.enableLocalStorage) {
      localStorage.removeItem(`cache_${key}`);
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    if (this.config.enableLocalStorage) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .forEach(key => localStorage.removeItem(key));
    }
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        if (this.config.enableLocalStorage) {
          localStorage.removeItem(`cache_${key}`);
        }
      }
    }
  }

  // Load from localStorage on initialization
  loadFromStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .forEach(storageKey => {
          const cacheKey = storageKey.replace('cache_', '');
          const entryStr = localStorage.getItem(storageKey);
          
          if (entryStr) {
            const entry = JSON.parse(entryStr);
            
            // Check if still valid
            if (Date.now() - entry.timestamp <= entry.ttl) {
              this.cache.set(cacheKey, entry);
            } else {
              localStorage.removeItem(storageKey);
            }
          }
        });
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  // Get cache statistics
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      if (this.config.enableLocalStorage) {
        localStorage.removeItem(`cache_${key}`);
      }
    });
  }

  // Force refresh specific cache entry
  forceRefresh(key: string): void {
    this.delete(key);
  }

  // Check if cache entry exists and is fresh
  isFresh(key: string, maxAge: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    return (Date.now() - entry.timestamp) < maxAge;
  }
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  // Critical data - very short TTL to stay in sync with Redis
  LATEST_BLOCK: 1000,        // 1 second (more aggressive refresh)
  NETWORK_STATS: 3000,       // 3 seconds (faster refresh)
  DASHBOARD_DATA: 500,       // 0.5 second (very fast refresh)
  
  // Semi-static data - shorter TTL for better UX
  BLOCKS: 5000,              // 5 seconds (faster refresh for lists)
  TRANSACTIONS: 3000,        // 3 seconds
  SMART_CONTRACTS: 10000,    // 10 seconds
  
  // Static data - reasonable TTL
  BLOCK_DETAILS: 60000,      // 1 minute (immutable but faster access)
  TRANSACTION_DETAILS: 60000, // 1 minute (immutable)
  CONTRACT_DETAILS: 30000,   // 30 seconds
  
  // User preferences
  USER_SETTINGS: 86400000,   // 24 hours
};

// Create singleton instance
export const cacheService = new CacheService({
  defaultTTL: 30000,
  maxEntries: 200,
  enableLocalStorage: true
});

// Initialize from localStorage
cacheService.loadFromStorage();

export default cacheService; 