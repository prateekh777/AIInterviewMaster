/**
 * Main Test Runner Script
 * Runs all test suites in the project
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test suite directories
const apiTestsDir = path.join(__dirname, 'api');
const dbTestsDir = path.join(__dirname, 'db');
const integrationTestsDir = path.join(__dirname, 'integration');

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

/**
 * Run all test files in a directory
 * @param {string} directory - The directory containing test files
 * @returns {Promise<void>} A promise that resolves when all tests complete
 */
async function runTestsInDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory does not exist: ${directory}`);
    return;
  }

  const files = fs.readdirSync(directory);
  const testFiles = files.filter(file => file.endsWith('.test.js'));

  if (testFiles.length === 0) {
    console.log(`No test files found in ${directory}`);
    return;
  }

  console.log(`\n====== Running tests in ${path.basename(directory)} ======\n`);
  
  for (const file of testFiles) {
    const testFilePath = path.join(directory, file);
    console.log(`\nRunning test file: ${file}`);
    
    try {
      // Convert to file URL for import
      const testFileUrl = new URL(`file://${testFilePath}`);
      
      // Run the test using dynamic import
      await import(testFileUrl);
    } catch (error) {
      console.error(`Error running test file ${file}:`, error);
    }
  }
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log('\n======================================');
  console.log('      Starting Test Suite Runner      ');
  console.log('======================================\n');
  
  const startTime = Date.now();
  
  // Run API tests
  await runTestsInDirectory(apiTestsDir);
  
  // Run DB tests
  await runTestsInDirectory(dbTestsDir);
  
  // Run integration tests
  await runTestsInDirectory(integrationTestsDir);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n======================================');
  console.log('            Test Summary              ');
  console.log('======================================');
  console.log(`Total duration: ${duration.toFixed(2)}s`);
  
  console.log('\n');
}

// Run all tests
runAllTests().catch(console.error);