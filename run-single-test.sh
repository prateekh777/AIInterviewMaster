#!/bin/bash

# Check if a test file was specified
if [ -z "$1" ]; then
  echo "Error: No test file specified."
  echo "Usage: $0 <test-file.js>"
  exit 1
fi

TEST_FILE=$1

echo "Running single test: $TEST_FILE"
echo "========================================"

# Start the test server in the background
node tests/simple-test-server.js &
SERVER_PID=$!

# Wait for the server to start (3 seconds should be enough)
sleep 3

# Run the specified test
node $TEST_FILE

# Store the exit code of the test
EXIT_CODE=$?

# Kill the test server
kill $SERVER_PID

# Return the exit code from the test
exit $EXIT_CODE