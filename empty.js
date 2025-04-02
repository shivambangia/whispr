// empty.js
// Minimal polyfill for Node.js async_hooks

class AsyncLocalStorage {
    constructor() {
      // No-op implementation; extend if needed
    }
    run(store, callback, ...args) {
      return callback(...args);
    }
    getStore() {
      return null;
    }
    exit(callback, ...args) {
      return callback(...args);
    }
  }
  
  module.exports = { AsyncLocalStorage };