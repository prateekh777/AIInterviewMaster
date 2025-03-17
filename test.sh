#!/bin/bash

# Run the entire test suite
./run-tests.sh

# Individual test script options
if [ "$1" == "api" ]; then
  # Run only API tests
  node tests/api/elevenlabs-api.test.js
  node tests/api/file-upload.test.js
  node tests/api/openai-api.test.js
  node tests/api/websocket.test.js
elif [ "$1" == "db" ]; then
  # Run only database tests
  node tests/db/mongodb-storage.test.js
elif [ "$1" == "elevenlabs" ]; then
  # Run only ElevenLabs API tests
  node tests/api/elevenlabs-api.test.js
elif [ "$1" == "openai" ]; then
  # Run only OpenAI API tests
  node tests/api/openai-api.test.js
elif [ "$1" == "websocket" ]; then
  # Run only WebSocket tests
  node tests/api/websocket.test.js
fi