const fs = require('fs');
const path = require('path');

class Cache {
  constructor(options = {}) {
    if (!options.maxSize || options.maxSize < 1) {
      throw new Error('maxSize is required and must be at least 1');
    }
    
    this.maxSize = options.maxSize;
    this.defaultTtlMs = options.defaultTtlMs || null;
    this.persistPath = options.persistPath || 'cache-store.json';
    
    // Core storage: Map for O(1) lookups
    this.store = new Map();
    
    // LRU tracking: doubly-linked list for O(1) move-to-front
    this.lruHead = null;
    this.lruTail = null;
    this.lruNodes = new Map(); // key -> node
    
    this._loadFromDisk();
  }
  
  set(key, value, options = {}) {
    const now = Date.now();
    const ttlMs = options.ttlMs !== undefined ? options.ttlMs : this.defaultTtlMs;
    const expiresAt = ttlMs ? now + ttlMs : null;
    
    const existing = this.store.get(key);
    
    if (existing) {
      // Update existing entry
      existing.value = value;
      existing.expiresAt = expiresAt;
      this._moveToFront(key);
    } else {
      // New entry - check if we need to evict
      if (this.store.size >= this.maxSize) {
        this._evictLRU();
      }
      
      this.store.set(key, { value, expiresAt });
      this._addToFront(key);
    }
    
    this._persistToDisk();
  }
  
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (this._isExpired(entry)) {
      this.delete(key);
      return undefined;
    }
    
    this._moveToFront(key);
    this._persistToDisk();
    return entry.value;
  }
  
  has(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this._isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  delete(key) {
    if (!this.store.has(key)) {
      return false;
    }
    
    this.store.delete(key);
    this._removeFromLRU(key);
    this._persistToDisk();
    return true;
  }
  
  clear() {
    this.store.clear();
    this.lruHead = null;
    this.lruTail = null;
    this.lruNodes.clear();
    this._persistToDisk();
  }
  
  size() {
    // Remove expired entries and return count
    let count = 0;
    const toDelete = [];
    
    for (const [key, entry] of this.store.entries()) {
      if (this._isExpired(entry)) {
        toDelete.push(key);
      } else {
        count++;
      }
    }
    
    if (toDelete.length > 0) {
      for (const key of toDelete) {
        this.delete(key);
      }
    }
    
    return count;
  }
  
  keys() {
    const result = [];
    const toDelete = [];
    
    for (const [key, entry] of this.store.entries()) {
      if (this._isExpired(entry)) {
        toDelete.push(key);
      } else {
        result.push(key);
      }
    }
    
    if (toDelete.length > 0) {
      for (const key of toDelete) {
        this.delete(key);
      }
    }
    
    return result;
  }
  
  // Private helpers
  
  _isExpired(entry) {
    return entry.expiresAt !== null && Date.now() >= entry.expiresAt;
  }
  
  _evictLRU() {
    if (!this.lruTail) return;
    
    const keyToEvict = this.lruTail.key;
    this.store.delete(keyToEvict);
    this._removeFromLRU(keyToEvict);
  }
  
  _addToFront(key) {
    const node = { key, prev: null, next: this.lruHead };
    
    if (this.lruHead) {
      this.lruHead.prev = node;
    }
    
    this.lruHead = node;
    
    if (!this.lruTail) {
      this.lruTail = node;
    }
    
    this.lruNodes.set(key, node);
  }
  
  _moveToFront(key) {
    const node = this.lruNodes.get(key);
    if (!node || node === this.lruHead) return;
    
    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    }
    
    if (node === this.lruTail) {
      this.lruTail = node.prev;
    }
    
    // Move to front
    node.prev = null;
    node.next = this.lruHead;
    
    if (this.lruHead) {
      this.lruHead.prev = node;
    }
    
    this.lruHead = node;
  }
  
  _removeFromLRU(key) {
    const node = this.lruNodes.get(key);
    if (!node) return;
    
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.lruHead = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.lruTail = node.prev;
    }
    
    this.lruNodes.delete(key);
  }
  
  _persistToDisk() {
    try {
      const lruOrder = [];
      let current = this.lruHead;
      while (current) {
        lruOrder.push(current.key);
        current = current.next;
      }
      
      const data = {
        entries: Array.from(this.store.entries()).map(([key, entry]) => ({
          key,
          value: entry.value,
          expiresAt: entry.expiresAt
        })),
        lruOrder
      };
      
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      // Silent failure for persistence - cache continues to work in memory
      console.error('Failed to persist cache:', err.message);
    }
  }
  
  _loadFromDisk() {
    try {
      if (!fs.existsSync(this.persistPath)) {
        return;
      }
      
      const content = fs.readFileSync(this.persistPath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.entries || !Array.isArray(data.entries)) {
        return;
      }
      
      const now = Date.now();
      const validEntries = new Map();
      
      // Load non-expired entries
      for (const item of data.entries) {
        if (item.expiresAt === null || item.expiresAt > now) {
          validEntries.set(item.key, {
            value: item.value,
            expiresAt: item.expiresAt
          });
        }
      }
      
      // Restore LRU order (filtering out expired entries)
      if (data.lruOrder && Array.isArray(data.lruOrder)) {
        for (const key of data.lruOrder) {
          if (validEntries.has(key)) {
            this.store.set(key, validEntries.get(key));
            this._addToFront(key);
          }
        }
        
        // Reverse the order since we added from head
        this._reverseLRU();
      } else {
        // No LRU order - just add entries
        for (const [key, entry] of validEntries.entries()) {
          this.store.set(key, entry);
          this._addToFront(key);
        }
      }
      
    } catch (err) {
      // Corrupted file - start fresh
      console.error('Failed to load cache, starting fresh:', err.message);
    }
  }
  
  _reverseLRU() {
    let prev = null;
    let current = this.lruHead;
    
    while (current) {
      const next = current.next;
      current.next = prev;
      current.prev = next;
      prev = current;
      current = next;
    }
    
    const temp = this.lruHead;
    this.lruHead = this.lruTail;
    this.lruTail = temp;
  }
}

module.exports = Cache;