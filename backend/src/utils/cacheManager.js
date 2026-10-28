'use strict';

const NodeCache = require('node-cache');

// Default TTL: 1 hour; max keys: 100
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL, 10) || 3600;
const MAX_KEYS = parseInt(process.env.CACHE_MAX_KEYS, 10) || 100;

/**
 * Singleton NodeCache instance shared across the application.
 */
const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: Math.floor(DEFAULT_TTL / 4), // Check for expired keys every quarter of TTL
  maxKeys: MAX_KEYS,
  useClones: false, // Return references for performance (callers must not mutate)
});

cache.on('expired', (key) => {
  console.log(`[Cache] Key expired: ${key}`);
});

/**
 * Get a value from the cache.
 * @param {string} key
 * @returns {any|undefined}
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set a value in the cache.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl] - Optional TTL in seconds (overrides default)
 * @returns {boolean}
 */
function set(key, value, ttl) {
  if (ttl !== undefined) {
    return cache.set(key, value, ttl);
  }
  return cache.set(key, value);
}

/**
 * Delete a key from the cache.
 * @param {string} key
 * @returns {number} number of deleted entries
 */
function del(key) {
  return cache.del(key);
}

/**
 * Check if a key exists in the cache.
 * @param {string} key
 * @returns {boolean}
 */
function has(key) {
  return cache.has(key);
}

/**
 * Flush the entire cache.
 */
function flush() {
  cache.flushAll();
}

/**
 * Get all keys currently in cache.
 * @returns {string[]}
 */
function keys() {
  return cache.keys();
}

/**
 * Get cache statistics.
 * @returns {object}
 */
function stats() {
  return cache.getStats();
}

/**
 * Get or compute a value. If the key exists, return it. Otherwise, call
 * the async factory function, store its result, and return it.
 * @param {string} key
 * @param {Function} factory - async () => value
 * @param {number} [ttl]
 * @returns {Promise<any>}
 */
async function getOrSet(key, factory, ttl) {
  const cached = get(key);
  if (cached !== undefined) {
    console.log(`[Cache] HIT: ${key}`);
    return cached;
  }
  console.log(`[Cache] MISS: ${key} — computing…`);
  const value = await factory();
  set(key, value, ttl);
  return value;
}

module.exports = { get, set, del, has, flush, keys, stats, getOrSet };
