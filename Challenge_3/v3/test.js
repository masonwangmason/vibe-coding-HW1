const assert = require('assert');
const fs = require('fs');
const Cache = require('./cache');

// Test utilities
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanupTestFile(path) {
  try {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  } catch (err) {
    // Ignore
  }
}

// Test suite
async function runTests() {
  console.log('Running cache tests...\n');
  
  // Test 1: Basic set/get/has/delete/clear/size
  {
    const testPath = 'test-cache-1.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 3, persistPath: testPath });
    
    // Empty cache
    assert.strictEqual(cache.size(), 0);
    assert.strictEqual(cache.get('key1'), undefined);
    assert.strictEqual(cache.has('key1'), false);
    
    // Set and get
    cache.set('key1', 'value1');
    assert.strictEqual(cache.get('key1'), 'value1');
    assert.strictEqual(cache.has('key1'), true);
    assert.strictEqual(cache.size(), 1);
    
    // Set multiple
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    assert.strictEqual(cache.size(), 3);
    
    // Delete
    assert.strictEqual(cache.delete('key2'), true);
    assert.strictEqual(cache.has('key2'), false);
    assert.strictEqual(cache.size(), 2);
    assert.strictEqual(cache.delete('key2'), false); // Already deleted
    
    // Clear
    cache.clear();
    assert.strictEqual(cache.size(), 0);
    assert.strictEqual(cache.has('key1'), false);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 1: Basic operations passed');
  }
  
  // Test 2: TTL expiration with real time
  {
    const testPath = 'test-cache-2.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 5, persistPath: testPath });
    
    // Set with short TTL
    cache.set('shortLived', 'value', { ttlMs: 50 });
    assert.strictEqual(cache.get('shortLived'), 'value');
    assert.strictEqual(cache.has('shortLived'), true);
    
    // Wait for expiration
    await sleep(60);
    
    assert.strictEqual(cache.get('shortLived'), undefined);
    assert.strictEqual(cache.has('shortLived'), false);
    assert.strictEqual(cache.size(), 0);
    
    // Set with default TTL
    const cache2 = new Cache({ maxSize: 5, defaultTtlMs: 50, persistPath: testPath });
    cache2.set('defaultTtl', 'value');
    assert.strictEqual(cache2.get('defaultTtl'), 'value');
    
    await sleep(60);
    assert.strictEqual(cache2.get('defaultTtl'), undefined);
    
    // Set without TTL (should not expire)
    cache2.set('noExpiry', 'persistent', { ttlMs: null });
    await sleep(60);
    assert.strictEqual(cache2.get('noExpiry'), 'persistent');
    
    cleanupTestFile(testPath);
    console.log('✓ Test 2: TTL expiration passed');
  }
  
  // Test 3: Expired keys removed on access
  {
    const testPath = 'test-cache-3.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 5, persistPath: testPath });
    
    cache.set('key1', 'value1', { ttlMs: 50 });
    cache.set('key2', 'value2');
    
    await sleep(60);
    
    // Accessing expired key should remove it
    assert.strictEqual(cache.get('key1'), undefined);
    
    // Size should only count non-expired
    assert.strictEqual(cache.size(), 1);
    
    // Keys should only return non-expired
    const keys = cache.keys();
    assert.strictEqual(keys.length, 1);
    assert.strictEqual(keys[0], 'key2');
    
    cleanupTestFile(testPath);
    console.log('✓ Test 3: Expired key removal passed');
  }
  
  // Test 4: LRU eviction order
  {
    const testPath = 'test-cache-4.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 3, persistPath: testPath });
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // All three should exist
    assert.strictEqual(cache.has('a'), true);
    assert.strictEqual(cache.has('b'), true);
    assert.strictEqual(cache.has('c'), true);
    
    // Adding 'd' should evict 'a' (least recently used)
    cache.set('d', 4);
    assert.strictEqual(cache.has('a'), false);
    assert.strictEqual(cache.has('d'), true);
    assert.strictEqual(cache.size(), 3);
    
    // Access 'b' to make it most recent
    cache.get('b');
    
    // Add 'e' - should evict 'c' (now LRU)
    cache.set('e', 5);
    assert.strictEqual(cache.has('c'), false);
    assert.strictEqual(cache.has('b'), true);
    assert.strictEqual(cache.has('d'), true);
    assert.strictEqual(cache.has('e'), true);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 4: LRU eviction passed');
  }
  
  // Test 5: Get affects recency
  {
    const testPath = 'test-cache-5.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 3, persistPath: testPath });
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // Access 'a' multiple times
    cache.get('a');
    cache.get('a');
    
    // Add 'd' - should evict 'b' (LRU)
    cache.set('d', 4);
    assert.strictEqual(cache.has('a'), true);
    assert.strictEqual(cache.has('b'), false);
    assert.strictEqual(cache.has('c'), true);
    assert.strictEqual(cache.has('d'), true);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 5: Get affects recency passed');
  }
  
  // Test 6: Persistence - state written to file
  {
    const testPath = 'test-cache-6.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 5, persistPath: testPath });
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // File should exist
    assert.strictEqual(fs.existsSync(testPath), true);
    
    // File should be valid JSON
    const content = JSON.parse(fs.readFileSync(testPath, 'utf8'));
    assert.strictEqual(content.entries.length, 3);
    assert.strictEqual(content.lruOrder.length, 3);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 6: Persistence write passed');
  }
  
  // Test 7: New instance loads state correctly
  {
    const testPath = 'test-cache-7.json';
    cleanupTestFile(testPath);
    
    const cache1 = new Cache({ maxSize: 5, persistPath: testPath });
    cache1.set('key1', 'value1');
    cache1.set('key2', 'value2');
    cache1.get('key1'); // Move key1 to front
    cache1.set('key3', 'value3');
    
    // Create new instance - should load from disk
    const cache2 = new Cache({ maxSize: 5, persistPath: testPath });
    assert.strictEqual(cache2.get('key1'), 'value1');
    assert.strictEqual(cache2.get('key2'), 'value2');
    assert.strictEqual(cache2.get('key3'), 'value3');
    assert.strictEqual(cache2.size(), 3);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 7: Load state passed');
  }
  
  // Test 8: Expired entries not restored
  {
    const testPath = 'test-cache-8.json';
    cleanupTestFile(testPath);
    
    const cache1 = new Cache({ maxSize: 5, persistPath: testPath });
    cache1.set('shortLived', 'expires', { ttlMs: 50 });
    cache1.set('longLived', 'persists', { ttlMs: 10000 });
    
    await sleep(60);
    
    // Create new instance after expiration
    const cache2 = new Cache({ maxSize: 5, persistPath: testPath });
    assert.strictEqual(cache2.has('shortLived'), false);
    assert.strictEqual(cache2.has('longLived'), true);
    assert.strictEqual(cache2.size(), 1);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 8: Expired entries not restored passed');
  }
  
  // Test 9: Overwriting existing keys doesn't evict
  {
    const testPath = 'test-cache-9.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 3, persistPath: testPath });
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // Overwrite 'a' - should not evict anything
    cache.set('a', 10);
    assert.strictEqual(cache.size(), 3);
    assert.strictEqual(cache.get('a'), 10);
    assert.strictEqual(cache.has('b'), true);
    assert.strictEqual(cache.has('c'), true);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 9: Overwrite without eviction passed');
  }
  
  // Test 10: Max size edge case - many insertions
  {
    const testPath = 'test-cache-10.json';
    cleanupTestFile(testPath);
    
    const cache = new Cache({ maxSize: 5, persistPath: testPath });
    
    // Insert 10 items - only last 5 should remain
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, i);
    }
    
    assert.strictEqual(cache.size(), 5);
    
    // First 5 should be evicted
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(cache.has(`key${i}`), false);
    }
    
    // Last 5 should exist
    for (let i = 5; i < 10; i++) {
      assert.strictEqual(cache.has(`key${i}`), true);
      assert.strictEqual(cache.get(`key${i}`), i);
    }
    
    cleanupTestFile(testPath);
    console.log('✓ Test 10: Many insertions passed');
  }
  
  // Test 11: LRU order preserved after reload
  {
    const testPath = 'test-cache-11.json';
    cleanupTestFile(testPath);
    
    const cache1 = new Cache({ maxSize: 3, persistPath: testPath });
    cache1.set('a', 1);
    cache1.set('b', 2);
    cache1.set('c', 3);
    cache1.get('a'); // Move 'a' to front
    
    // Reload
    const cache2 = new Cache({ maxSize: 3, persistPath: testPath });
    
    // Add new item - should evict 'b' (LRU)
    cache2.set('d', 4);
    assert.strictEqual(cache2.has('a'), true);
    assert.strictEqual(cache2.has('b'), false);
    assert.strictEqual(cache2.has('c'), true);
    assert.strictEqual(cache2.has('d'), true);
    
    cleanupTestFile(testPath);
    console.log('✓ Test 11: LRU order preserved after reload passed');
  }
  
  // Test 12: Constructor validation
  {
    try {
      new Cache({});
      assert.fail('Should throw for missing maxSize');
    } catch (err) {
      assert.strictEqual(err.message.includes('maxSize'), true);
    }
    
    try {
      new Cache({ maxSize: 0 });
      assert.fail('Should throw for maxSize = 0');
    } catch (err) {
      assert.strictEqual(err.message.includes('maxSize'), true);
    }
    
    console.log('✓ Test 12: Constructor validation passed');
  }
  
  // Test 13: Corrupted file handling
  {
    const testPath = 'test-cache-13.json';
    cleanupTestFile(testPath);
    
    // Write corrupted JSON
    fs.writeFileSync(testPath, '{ invalid json', 'utf8');
    
    // Should start fresh without throwing
    const cache = new Cache({ maxSize: 3, persistPath: testPath });
    assert.strictEqual(cache.size(), 0);
    
    cache.set('key', 'value');
    assert.strictEqual(cache.get('key'), 'value');
    
    cleanupTestFile(testPath);
    console.log('✓ Test 13: Corrupted file handling passed');
  }
  
  console.log('\n✅ All tests passed!');
}

// Run tests
runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});