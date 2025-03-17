#!/bin/bash

# Run the test-server and tests in sequence
echo "========================================"
echo "Starting AI Interview Platform Test Suite"
echo "========================================"

# Set environment to test
export NODE_ENV=test

# Start the test server in the background
echo "Starting test server on port 5001..."
node tests/simple-test-server.js &
TEST_SERVER_PID=$!

# Wait for the server to initialize (5 seconds)
echo "Waiting for test server to initialize..."
sleep 5

# Check if the server is running by making a request to the status endpoint
echo "Checking if test server is running..."
SERVER_STATUS=$(curl -s http://localhost:5001/api/status || echo '{"status": "error"}')

if [[ "$SERVER_STATUS" == *"error"* ]]; then
  echo "Error: Test server failed to start!"
  # Kill the server process if it's still running
  kill $TEST_SERVER_PID 2>/dev/null
  exit 1
fi

echo "Test server running. Running tests..."
echo ""

# Run all the tests
node tests/run-tests.js

# Capture the exit code of the test runner
TEST_EXIT_CODE=$?

# Clean up: Kill the test server when done
echo ""
echo "Cleaning up: Stopping test server..."
kill $TEST_SERVER_PID

# Return the exit code from the tests
exit $TEST_EXIT_CODE