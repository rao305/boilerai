const mongoose = require('mongoose');

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/purdue_planner_test';
  
  // Connect to test database if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  }
});

// Clean up after each test suite
afterEach(async () => {
  // Clear all collections
  const collections = Object.keys(mongoose.connection.collections);
  for (const collectionName of collections) {
    const collection = mongoose.connection.collections[collectionName];
    await collection.deleteMany({});
  }
});

// Global cleanup
afterAll(async () => {
  // Drop test database and close connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for slower operations
jest.setTimeout(30000);

// Add custom jest matchers
expect.extend({
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${array.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${array.join(', ')}`,
        pass: false,
      };
    }
  },
});