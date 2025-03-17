#!/bin/bash

# Test WebSocket Communication
# This script runs the WebSocket test script with various parameters

# Set environment to test mode
export NODE_ENV=test

# Terminal colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}     WebSocket Test Runner     ${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if a port argument was provided
PORT=${1:-5000}
echo -e "${YELLOW}Using port:${NC} $PORT"

# Check what mode to run in (interactive or automated)
MODE=${2:-interactive}
echo -e "${YELLOW}Test mode:${NC} $MODE"

# First test - Connect to the application server
echo -e "\n${BLUE}Test 1:${NC} Connecting to application server on port $PORT"
node tests/websocket-test.js --url ws://localhost:$PORT/ws --mode $MODE

# Exit with the status of the last command
exit $?