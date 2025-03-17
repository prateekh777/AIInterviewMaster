/**
 * Test Runner Utility
 * Helps run tests and report results in a consistent format
 */

export class TestRunner {
  constructor(testName) {
    this.testName = testName;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.failures = [];
  }

  /**
   * Run a test function with proper reporting
   * @param {function} testFn - The function containing all test cases
   * @returns {Promise<void>} A promise that resolves when all tests complete
   */
  async run(testFn) {
    console.log(`\n=== Running Test Suite: ${this.testName} ===\n`);
    
    const startTime = Date.now();
    
    try {
      await testFn(this);
    } catch (error) {
      console.error(`\n❌ Error in test suite: ${error.message}`);
      console.error(error.stack);
      this.failed++;
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    this.reportSummary(duration);
  }

  /**
   * Run an individual test case
   * @param {string} description - The test description
   * @param {function} testFn - The test function to run
   * @param {boolean} skip - Whether to skip this test
   */
  async test(description, testFn, skip = false) {
    if (skip) {
      console.log(`  ⚠️  SKIPPED: ${description}`);
      this.skipped++;
      return;
    }
    
    try {
      console.log(`  🔍 Running: ${description}`);
      await testFn();
      console.log(`  ✅ PASSED: ${description}`);
      this.passed++;
    } catch (error) {
      console.error(`  ❌ FAILED: ${description}`);
      console.error(`    Error: ${error.message}`);
      if (error.stack) {
        console.error(`    Stack: ${error.stack.split('\n').slice(1, 3).join('\n           ')}`);
      }
      this.failed++;
      this.failures.push({ description, error });
    }
  }

  /**
   * Assert that a condition is true
   * @param {boolean} condition - The condition to check
   * @param {string} message - The message to show if assertion fails
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  /**
   * Assert that two values are equal
   * @param {any} actual - The actual value
   * @param {any} expected - The expected value
   * @param {string} message - The message to show if assertion fails
   */
  assertEquals(actual, expected, message) {
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) {
        throw new Error(message || `Expected array length ${expected.length}, but got ${actual.length}`);
      }
      
      for (let i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) {
          throw new Error(message || `Array elements at index ${i} are not equal: ${actual[i]} !== ${expected[i]}`);
        }
      }
      return;
    }
    
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
    }
  }

  /**
   * Assert that a value contains another value
   * @param {string|Array} haystack - The value to search in
   * @param {string|any} needle - The value to search for
   * @param {string} message - The message to show if assertion fails
   */
  assertContains(haystack, needle, message) {
    if (typeof haystack === 'string' && typeof needle === 'string') {
      if (!haystack.includes(needle)) {
        throw new Error(message || `Expected "${haystack}" to contain "${needle}"`);
      }
      return;
    }
    
    if (Array.isArray(haystack)) {
      if (!haystack.includes(needle)) {
        throw new Error(message || `Expected array to contain ${JSON.stringify(needle)}`);
      }
      return;
    }
    
    throw new Error('assertContains only works with strings and arrays');
  }

  /**
   * Report test results summary
   * @param {number} duration - Test duration in seconds
   */
  reportSummary(duration) {
    console.log(`\n=== Test Suite Summary: ${this.testName} ===`);
    console.log(`  ✅ Passed: ${this.passed}`);
    console.log(`  ❌ Failed: ${this.failed}`);
    console.log(`  ⚠️  Skipped: ${this.skipped}`);
    console.log(`  ⏱️  Duration: ${duration.toFixed(2)}s`);
    
    if (this.failures.length > 0) {
      console.log('\n=== Failed Tests ===');
      this.failures.forEach(({ description, error }, index) => {
        console.log(`  ${index + 1}. ${description}`);
        console.log(`     Error: ${error.message}`);
      });
    }
    
    console.log('\n');
  }
}