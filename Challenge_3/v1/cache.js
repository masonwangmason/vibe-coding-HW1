/**
 * LRU Cache with TTL and Persistence
 * Features:
 * - TTL (time-to-live) for cache entries
 * - LRU (Least Recently Used) eviction when full
 * - Persistence support (in-memory for this implementation)
 * - Configurable max size
 */

class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || null; // null means no expiration
    this.persistenceKey = options.persistenceKey || 'lru-cache';
    this.enablePersistence = options.enablePersistence !== false;
    
    // Internal storage
    this.cache = new Map(); // key -> { value, timestamp, ttl, accessOrder }
    this.accessCounter = 0; // Used to track access order for LRU
    
    // Load from persistence if enabled
    if (this.enablePersistence) {
      this._loadFromPersistence();
    }
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number|null} ttl - Time to live in milliseconds (null = no expiration)
   */
  set(key, value, ttl = null) {
    // Use provided TTL, fallback to default, or null
    const expirationTime = ttl !== null ? ttl : this.defaultTTL;
    
    // Check if we need to evict (only if key doesn't exist)
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this._evictLRU();
    }
    
    const entry = {
      value,
      timestamp: Date.now(),
      ttl: expirationTime,
      accessOrder: this.accessCounter++
    };
    
    this.cache.set(key, entry);
    
    if (this.enablePersistence) {
      this._persist();
    }
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry has expired
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      if (this.enablePersistence) {
        this._persist();
      }
      return undefined;
    }
    
    // Update access order for LRU
    entry.accessOrder = this.accessCounter++;
    
    return entry.value;
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      if (this.enablePersistence) {
        this._persist();
      }
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted, false if not found
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (deleted && this.enablePersistence) {
      this._persist();
    }
    
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
    this.accessCounter = 0;
    
    if (this.enablePersistence) {
      this._persist();
    }
  }

  /**
   * Get current cache size
   * @returns {number}
   */
  size() {
    this._cleanExpired();
    return this.cache.size;
  }

  /**
   * Get all keys (non-expired only)
   * @returns {string[]}
   */
  keys() {
    this._cleanExpired();
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  stats() {
    this._cleanExpired();
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Check if an entry has expired
   * @private
   */
  _isExpired(entry) {
    if (entry.ttl === null) {
      return false;
    }
    
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict the least recently used entry
   * @private
   */
  _evictLRU() {
    let lruKey = null;
    let lruAccessOrder = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessOrder < lruAccessOrder) {
        lruAccessOrder = entry.accessOrder;
        lruKey = key;
      }
    }
    
    if (lruKey !== null) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clean all expired entries
   * @private
   */
  _cleanExpired() {
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this._isExpired(entry)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0 && this.enablePersistence) {
      this._persist();
    }
  }

  /**
   * Persist cache to storage (in-memory implementation)
   * @private
   */
  _persist() {
    // In-memory persistence simulation
    // In a real implementation, this would use localStorage or filesystem
    const data = {
      entries: Array.from(this.cache.entries()),
      accessCounter: this.accessCounter
    };
    
    // Simulate persistence
    this._persistedData = JSON.stringify(data);
  }

  /**
   * Load cache from persistence
   * @private
   */
  _loadFromPersistence() {
    try {
      // In-memory persistence simulation
      if (this._persistedData) {
        const data = JSON.parse(this._persistedData);
        this.cache = new Map(data.entries);
        this.accessCounter = data.accessCounter;
        
        // Clean expired entries after loading
        this._cleanExpired();
      }
    } catch (e) {
      // Ignore persistence errors
      console.warn('Failed to load from persistence:', e);
    }
  }

  /**
   * Export cache data (for testing/debugging)
   * @returns {string}
   */
  export() {
    this._cleanExpired();
    return JSON.stringify({
      entries: Array.from(this.cache.entries()),
      accessCounter: this.accessCounter
    });
  }

  /**
   * Import cache data (for testing/debugging)
   * @param {string} data - JSON string of cache data
   */
  import(data) {
    try {
      const parsed = JSON.parse(data);
      this.cache = new Map(parsed.entries);
      this.accessCounter = parsed.accessCounter;
      this._cleanExpired();
    } catch (e) {
      throw new Error('Invalid cache data format');
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LRUCache;
}