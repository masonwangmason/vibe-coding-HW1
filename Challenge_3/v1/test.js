/**
 * Test Suite for LRU Cache with TTL and Persistence
 * 
 * To run these tests:
 * 1. Copy both the cache implementation and this test file
 * 2. In Node.js: node test-cache.js
 * 3. In browser: Include both files and run runAllTests() in console
 */

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Cache Tests...\n');
    
    for (const test of this.tests) {
      this.results.total++;
      try {
        await test.fn();
        this.results.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.failed++;
        console.error(`❌ ${test.name}`);
        console.error(`   ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Results: ${this.results.passed}/${this.results.total} passed`);
    if (this.results.failed > 0) {
      console.log(`❌ ${this.results.failed} tests failed`);
    } else {
      console.log('✅ All tests passed!');
    }
    
    return this.results;
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      message || `Expected ${expectedStr}, but got ${actualStr}`
    );
  }
}

// Utility to wait for time to pass
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite
async function runAllTests() {
  const runner = new TestRunner();

  // === Basic Operations Tests ===
  
  runner.test('Basic set and get', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1');
    assertEqual(cache.get('key1'), 'value1');
  });

  runner.test('Get non-existent key returns undefined', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    assertEqual(cache.get('nonexistent'), undefined);
  });

  runner.test('Has method works correctly', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1');
    assert(cache.has('key1'), 'Should have key1');
    assert(!cache.has('key2'), 'Should not have key2');
  });

  runner.test('Delete removes entries', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1');
    assert(cache.delete('key1'), 'Delete should return true');
    assertEqual(cache.get('key1'), undefined);
    assert(!cache.has('key1'), 'Key should not exist after delete');
  });

  runner.test('Clear removes all entries', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    assertEqual(cache.size(), 0);
    assertEqual(cache.get('key1'), undefined);
    assertEqual(cache.get('key2'), undefined);
  });

  runner.test('Size method returns correct count', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    assertEqual(cache.size(), 0);
    cache.set('key1', 'value1');
    assertEqual(cache.size(), 1);
    cache.set('key2', 'value2');
    assertEqual(cache.size(), 2);
    cache.delete('key1');
    assertEqual(cache.size(), 1);
  });

  runner.test('Keys method returns all keys', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    const keys = cache.keys();
    assertEqual(keys.length, 3);
    assert(keys.includes('key1'), 'Should include key1');
    assert(keys.includes('key2'), 'Should include key2');
    assert(keys.includes('key3'), 'Should include key3');
  });

  // === TTL Tests ===

  runner.test('TTL: Entry expires after TTL', async () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1', 100); // 100ms TTL
    assertEqual(cache.get('key1'), 'value1');
    await sleep(150); // Wait for expiration
    assertEqual(cache.get('key1'), undefined);
    assert(!cache.has('key1'), 'Key should not exist after TTL');
  });

  runner.test('TTL: Entry with null TTL never expires', async () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1', null);
    await sleep(100);
    assertEqual(cache.get('key1'), 'value1');
  });

  runner.test('TTL: Default TTL is applied', async () => {
    const cache = new LRUCache({ 
      maxSize: 10, 
      defaultTTL: 100,
      enablePersistence: false 
    });
    cache.set('key1', 'value1'); // Should use default TTL
    assertEqual(cache.get('key1'), 'value1');
    await sleep(150);
    assertEqual(cache.get('key1'), undefined);
  });

  runner.test('TTL: Different entries can have different TTLs', async () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('short', 'value1', 50);
    cache.set('long', 'value2', 200);
    
    await sleep(100);
    assertEqual(cache.get('short'), undefined, 'Short TTL should expire');
    assertEqual(cache.get('long'), 'value2', 'Long TTL should still exist');
    
    await sleep(150);
    assertEqual(cache.get('long'), undefined, 'Long TTL should now expire');
  });

  runner.test('TTL: Expired entries are cleaned from size/keys', async () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1', 50);
    cache.set('key2', 'value2', 200);
    assertEqual(cache.size(), 2);
    
    await sleep(100);
    assertEqual(cache.size(), 1, 'Size should reflect expired entry removal');
    const keys = cache.keys();
    assertEqual(keys.length, 1);
    assert(!keys.includes('key1'), 'Expired key should not be in keys');
  });

  // === LRU Eviction Tests ===

  runner.test('LRU: Evicts least recently used when full', () => {
    const cache = new LRUCache({ maxSize: 3, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Access key1 to make it more recently used
    cache.get('key1');
    
    // Add key4, should evict key2 (least recently used)
    cache.set('key4', 'value4');
    
    assertEqual(cache.size(), 3);
    assertEqual(cache.get('key1'), 'value1', 'key1 should still exist');
    assertEqual(cache.get('key2'), undefined, 'key2 should be evicted');
    assertEqual(cache.get('key3'), 'value3', 'key3 should still exist');
    assertEqual(cache.get('key4'), 'value4', 'key4 should exist');
  });

  runner.test('LRU: Get updates access order', () => {
    const cache = new LRUCache({ maxSize: 3, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Access key1 multiple times
    cache.get('key1');
    cache.get('key1');
    
    // Add two more, should evict key2 and key3 (least recently used)
    cache.set('key4', 'value4');
    cache.set('key5', 'value5');
    
    assertEqual(cache.get('key1'), 'value1', 'key1 should survive');
    assertEqual(cache.get('key2'), undefined, 'key2 should be evicted');
    assertEqual(cache.get('key3'), undefined, 'key3 should be evicted');
  });

  runner.test('LRU: Updating existing key does not trigger eviction', () => {
    const cache = new LRUCache({ maxSize: 2, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    // Update key1 (should not evict anything)
    cache.set('key1', 'value1-updated');
    
    assertEqual(cache.size(), 2);
    assertEqual(cache.get('key1'), 'value1-updated');
    assertEqual(cache.get('key2'), 'value2');
  });

  runner.test('LRU: Works correctly with max size 1', () => {
    const cache = new LRUCache({ maxSize: 1, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    assertEqual(cache.size(), 1);
    assertEqual(cache.get('key1'), undefined, 'key1 should be evicted');
    assertEqual(cache.get('key2'), 'value2', 'key2 should exist');
  });

  // === Persistence Tests ===

  runner.test('Persistence: Export and import work correctly', () => {
    const cache1 = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache1.set('key1', 'value1');
    cache1.set('key2', 'value2');
    
    const exported = cache1.export();
    
    const cache2 = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache2.import(exported);
    
    assertEqual(cache2.get('key1'), 'value1');
    assertEqual(cache2.get('key2'), 'value2');
    assertEqual(cache2.size(), 2);
  });

  runner.test('Persistence: Import removes expired entries', async () => {
    const cache1 = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache1.set('key1', 'value1', 50);
    cache1.set('key2', 'value2', 200);
    
    await sleep(100);
    
    const exported = cache1.export();
    
    const cache2 = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache2.import(exported);
    
    assertEqual(cache2.get('key1'), undefined, 'Expired entry should not load');
    assertEqual(cache2.get('key2'), 'value2', 'Non-expired entry should load');
    assertEqual(cache2.size(), 1);
  });

  runner.test('Persistence: Invalid import throws error', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    
    try {
      cache.import('invalid json');
      throw new Error('Should have thrown an error');
    } catch (e) {
      assert(e.message.includes('Invalid cache data format'), 
        'Should throw format error');
    }
  });

  // === Max Size Tests ===

  runner.test('Max size: Enforces maximum cache size', () => {
    const cache = new LRUCache({ maxSize: 5, enablePersistence: false });
    
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    assertEqual(cache.size(), 5, 'Cache should not exceed max size');
  });

  runner.test('Max size: Can be configured', () => {
    const cache1 = new LRUCache({ maxSize: 3, enablePersistence: false });
    const cache2 = new LRUCache({ maxSize: 100, enablePersistence: false });
    
    for (let i = 0; i < 10; i++) {
      cache1.set(`key${i}`, `value${i}`);
      cache2.set(`key${i}`, `value${i}`);
    }
    
    assertEqual(cache1.size(), 3);
    assertEqual(cache2.size(), 10);
  });

  // === Complex Scenarios ===

  runner.test('Complex: TTL and LRU work together', async () => {
    const cache = new LRUCache({ maxSize: 3, enablePersistence: false });
    cache.set('key1', 'value1', 100); // Will expire
    cache.set('key2', 'value2'); // No expiration
    cache.set('key3', 'value3'); // No expiration
    
    await sleep(150); // key1 expires
    
    // Cache is now size 2, add 2 more
    cache.set('key4', 'value4');
    cache.set('key5', 'value5');
    
    assertEqual(cache.size(), 3);
    assertEqual(cache.get('key1'), undefined, 'Should be expired');
    assertEqual(cache.get('key2'), undefined, 'Should be evicted by LRU');
    assertEqual(cache.get('key3'), 'value3');
    assertEqual(cache.get('key4'), 'value4');
    assertEqual(cache.get('key5'), 'value5');
  });

  runner.test('Complex: Stats method returns accurate information', () => {
    const cache = new LRUCache({ maxSize: 10, enablePersistence: false });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const stats = cache.stats();
    assertEqual(stats.size, 2);
    assertEqual(stats.maxSize, 10);
    assertEqual(stats.keys.length, 2);
    assert(stats.keys.includes('key1'));
    assert(stats.keys.includes('key2'));
  });

  return await runner.run();
}

// Run tests
if (typeof window !== 'undefined') {
  window.runAllTests = runAllTests;
  console.log('Tests loaded. Run runAllTests() to execute.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}