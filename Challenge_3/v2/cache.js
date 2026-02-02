const fs = require('fs');
const path = require('path');

class Cache {
  constructor(maxSize = 100, filePath = 'cache-store.json') {
    this.maxSize = maxSize;
    this.filePath = filePath;
    this.cache = new Map();
    this.accessOrder = [];
    this.load();
  }

  set(key, value, ttl = null) {
    const now = Date.now();
    const expiresAt = ttl ? now + ttl : null;
    
    // If key exists, remove from access order
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }
    
    // If at capacity and key is new, evict LRU
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // Set the entry
    this.cache.set(key, { value, expiresAt });
    this.accessOrder.push(key);
    
    this.persist();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // Check if expired
    if (entry.expiresAt && now >= entry.expiresAt) {
      this.delete(key);
      return undefined;
    }
    
    // Update access order (move to end)
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    this.persist();
    
    return entry.value;
  }

  delete(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.persist();
    }
  }

  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    if (entry.expiresAt && now >= entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.persist();
  }

  size() {
    return this.cache.size;
  }

  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
  }

  persist() {
    const now = Date.now();
    const data = {
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        value: entry.value,
        expiresAt: entry.expiresAt
      })),
      accessOrder: this.accessOrder
    };
    
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to persist cache:', err);
    }
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      
      const fileContent = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(fileContent);
      const now = Date.now();
      
      // Filter out expired entries
      const validEntries = data.entries.filter(entry => {
        return !entry.expiresAt || now < entry.expiresAt;
      });
      
      // Restore cache
      this.cache.clear();
      this.accessOrder = [];
      
      validEntries.forEach(entry => {
        this.cache.set(entry.key, {
          value: entry.value,
          expiresAt: entry.expiresAt
        });
      });
      
      // Restore access order, filtering out expired keys
      this.accessOrder = data.accessOrder.filter(key => this.cache.has(key));
      
    } catch (err) {
      console.error('Failed to load cache:', err);
      this.cache.clear();
      this.accessOrder = [];
    }
  }
}

module.exports = Cache;