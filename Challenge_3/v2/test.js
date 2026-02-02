const assert = require('assert');
const fs = require('fs');
const Cache = require('./cache.js');

const TEST_FILE = 'test-cache-store.json';

function cleanupTestFile() {
  if (fs.existsSync(TEST_FILE)) {
    fs.unlinkSync(TEST_FILE);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('Running cache tests...\n');

  // Test 1: Basic set and get
  console.log('Test 1: Basic set and get');
  cleanupTestFile();
  {
    const cache = new Cache(10, TEST_FILE);
    cache.set('key1', 'value1');
    assert.strictEqual(cache.get('key1'), 'value1');
    assert.strictEqual(cache.get('nonexistent'), undefined);
    console.log('✓ Passed\n');
  }

  // Test 2: TTL expiration
  console.log('Test 2: TTL expiration');
  cleanupTestFile();
  {
    const cache = new Cache(10, TEST_FILE);
    cache.set('shortLived', 'value', 50);
    assert.strictEqual(cache.get('shortLived'), 'value');
    await sleep(60);
    assert.strictEqual(cache.get('shortLived'), undefined);
    console.log('✓ Passed\n');
  }

  // Test 3: LRU eviction with maxSize=2
  console.log('Test 3: LRU eviction (maxSize=2)');
  cleanupTestFile();
  {
    const cache = new Cache(2, TEST_FILE);
    cache.set('A', 'valueA');
    cache.set('B', 'valueB');
    cache.get('A'); // A becomes most recently used
    cache.set('C', 'valueC'); // B should be evicted
    
    assert.strictEqual(cache.get('A'), 'valueA');
    assert.strictEqual(cache.get('B'), undefined); // B was evicted
    assert.strictEqual(cache.get('C'), 'valueC');
    console.log('✓ Passed\n');
  }

  // Test 4: LRU eviction without intermediate access
  console.log('Test 4: LRU eviction without access');
  cleanupTestFile();
  {
    const cache = new Cache(2, TEST_FILE);
    cache.set('A', 'valueA');
    cache.set('B', 'valueB');
    cache.set('C', 'valueC'); // A should be evicted
    
    assert.strictEqual(cache.get('A'), undefined); // A was evicted
    assert.strictEqual(cache.get('B'), 'valueB');
    assert.strictEqual(cache.get('C'), 'valueC');
    console.log('✓ Passed\n');
  }

  // Test 5: Persistence - save and reload
  console.log('Test 5: Persistence across restarts');
  cleanupTestFile();
  {
    const cache1 = new Cache(10, TEST_FILE);
    cache1.set('persist1', 'value1');
    cache1.set('persist2', 'value2');
    
    // Create new cache instance (simulates restart)
    const cache2 = new Cache(10, TEST_FILE);
    assert.strictEqual(cache2.get('persist1'), 'value1');
    assert.strictEqual(cache2.get('persist2'), 'value2');
    console.log('✓ Passed\n');
  }

  // Test 6: Expired entries not restored on load
  console.log('Test 6: Expired entries filtered on load');
  cleanupTestFile();
  {
    const cache1 = new Cache(10, TEST_FILE);
    cache1.set('expired', 'value', 50);
    cache1.set('valid', 'value');
    
    await sleep(60);
    
    // Create new cache instance after expiration
    const cache2 = new Cache(10, TEST_FILE);
    assert.strictEqual(cache2.get('expired'), undefined);
    assert.strictEqual(cache2.get('valid'), 'value');
    console.log('✓ Passed\n');
  }

  // Test 7: LRU order preserved across persistence
  console.log('Test 7: LRU order preserved on reload');
  cleanupTestFile();
  {
    const cache1 = new Cache(2, TEST_FILE);
    cache1.set('A', 'valueA');
    cache1.set('B', 'valueB');
    cache1.get('A'); // A becomes most recent
    
    const cache2 = new Cache(2, TEST_FILE);
    cache2.set('C', 'valueC'); // B should be evicted (LRU)
    
    assert.strictEqual(cache2.get('A'), 'valueA');
    assert.strictEqual(cache2.get('B'), undefined);
    assert.strictEqual(cache2.get('C'), 'valueC');
    console.log('✓ Passed\n');
  }

  // Test 8: Update existing key doesn't change size
  console.log('Test 8: Updating existing key');
  cleanupTestFile();
  {
    const cache = new Cache(2, TEST_FILE);
    cache.set('A', 'value1');
    cache.set('B', 'value2');
    cache.set('A', 'newValue'); // Update A
    
    assert.strictEqual(cache.size(), 2);
    assert.strictEqual(cache.get('A'), 'newValue');
    assert.strictEqual(cache.get('B'), 'value2');
    console.log('✓ Passed\n');
  }

  // Test 9: Clear cache
  console.log('Test 9: Clear cache');
  cleanupTestFile();
  {
    const cache = new Cache(10, TEST_FILE);
    cache.set('A', 'valueA');
    cache.set('B', 'valueB');
    cache.clear();
    
    assert.strictEqual(cache.size(), 0);
    assert.strictEqual(cache.get('A'), undefined);
    assert.strictEqual(cache.get('B'), undefined);
    console.log('✓ Passed\n');
  }

  // Test 10: Has method respects expiration
  console.log('Test 10: Has method with expiration');
  cleanupTestFile();
  {
    const cache = new Cache(10, TEST_FILE);
    cache.set('key', 'value', 50);
    assert.strictEqual(cache.has('key'), true);
    await sleep(60);
    assert.strictEqual(cache.has('key'), false);
    console.log('✓ Passed\n');
  }

  // Test 11: Multiple expirations
  console.log('Test 11: Multiple entries with different TTLs');
  cleanupTestFile();
  {
    const cache = new Cache(10, TEST_FILE);
    cache.set('short', 'value1', 50);
    cache.set('long', 'value2', 200);
    cache.set('forever', 'value3');
    
    await sleep(60);
    assert.strictEqual(cache.get('short'), undefined);
    assert.strictEqual(cache.get('long'), 'value2');
    assert.strictEqual(cache.get('forever'), 'value3');
    
    await sleep(150);
    assert.strictEqual(cache.get('long'), undefined);
    assert.strictEqual(cache.get('forever'), 'value3');
    console.log('✓ Passed\n');
  }

  // Cleanup
  cleanupTestFile();
  
  console.log('All tests passed! ✓');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  cleanupTestFile();
  process.exit(1);
});