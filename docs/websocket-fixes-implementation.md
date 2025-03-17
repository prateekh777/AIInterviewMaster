# WebSocket Fixes Implementation Plan

## Issue Analysis

After reviewing the codebase and test infrastructure, the following key issues have been identified that are causing the WebSocket tests to fail:

### 1. WebSocket Server Configuration Mismatch

**Problem**: The test server (`simple-test-server.js`) has a very basic WebSocket implementation that only echoes back messages. It doesn't implement the actual WebSocket protocol handlers needed for the tests.

```javascript
// Current implementation in tests/test-server.js
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');
  
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());
    // Echo back the message for testing
    ws.send(JSON.stringify({ type: 'echo', message: JSON.parse(message.toString()) }));
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});
```

**Solution**: Update the test server to properly implement the WebSocket protocol handlers needed for the interview process.

### 2. Message Type Discrepancy

**Problem**: The WebSocket test client expects different message types than what the server sends:

- Client expects: `WELCOME`, `INTERVIEW_PAUSED`, `INTERVIEW_RESUMED`, `INTERVIEW_ENDED`
- Server sends: `SESSION_CREATED`, `AI_MESSAGE`, `ERROR`

These mismatches cause the tests to timeout waiting for messages that never arrive.

**Solution**: Update either the test client or the test server to use consistent message types.

### 3. Test Server Port Configuration

**Problem**: The WebSocket client is configured to connect to port 5000:

```javascript
constructor(url = 'ws://localhost:5000/ws') {
  this.url = url;
  // ...
}
```

But the test server runs on port 5001, causing connection failures.

**Solution**: Update the WebSocket client to use port 5001 when running in test mode.

### 4. Interview Session Initialization

**Problem**: The tests assume a session is immediately created after sending a START_INTERVIEW message, but the server implementation requires additional steps to fully initialize a session.

**Solution**: Enhance the test server's WebSocket implementation to properly handle interview session initialization.

## Implementation Plan

### Phase 1: Align WebSocket Client and Test Server

1. Update `tests/utils/websocket-client.js`:
   ```javascript
   constructor(url = process.env.NODE_ENV === 'test' ? 'ws://localhost:5001/ws' : 'ws://localhost:5000/ws') {
     this.url = url;
     // ...
   }
   ```

2. Create message type mapping in the WebSocket test client:
   ```javascript
   // Add message type mapping to translate between server and test expectations
   const MESSAGE_TYPE_MAPPING = {
     'SESSION_CREATED': 'WELCOME',
     'INTERVIEW_PAUSED': 'INTERVIEW_PAUSED',
     'INTERVIEW_RESUMED': 'INTERVIEW_RESUMED',
     'INTERVIEW_ENDED': 'INTERVIEW_ENDED',
     'AI_MESSAGE': 'AI_MESSAGE',
     'ERROR': 'ERROR'
   };
   ```

### Phase 2: Enhance Test Server WebSocket Implementation

Replace the simple echo handler in `tests/test-server.js` with a more comprehensive implementation:

```javascript
// Setup WebSocket server for testing with proper interview simulation
const wss = new WebSocketServer({ server, path: '/ws' });
const testSessions = new Map();

wss.on('connection', (ws) => {
  console.log('WebSocket connection established');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message type:', data.type);
      
      switch (data.type.toUpperCase()) {
        case 'START_INTERVIEW':
          // Create test session and send response
          const sessionId = `test-session-${Date.now()}`;
          testSessions.set(sessionId, {
            id: sessionId,
            interviewId: data.interviewId || Math.floor(Math.random() * 1000),
            isPaused: false
          });
          
          // Send session created response
          ws.send(JSON.stringify({
            type: 'SESSION_CREATED',
            sessionId: sessionId
          }));
          
          // Send initial AI message after a short delay
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'AI_MESSAGE',
              id: `msg-${Date.now()}`,
              text: 'Hello! Welcome to your interview. Let\'s start with a first question: Tell me about your experience with the technologies mentioned in your resume.',
              timestamp: Date.now()
            }));
          }, 500);
          break;
          
        case 'USER_MESSAGE':
          // Check if session exists
          if (!testSessions.has(data.sessionId)) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: `Session ${data.sessionId} not found`,
              message: `Session ${data.sessionId} not found`
            }));
            return;
          }
          
          // Send typing indicator
          ws.send(JSON.stringify({
            type: 'TYPING_INDICATOR',
            isTyping: true
          }));
          
          // Send AI response after a short delay
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'TYPING_INDICATOR',
              isTyping: false
            }));
            
            ws.send(JSON.stringify({
              type: 'AI_MESSAGE',
              id: `msg-${Date.now()}`,
              text: 'Thank you for sharing that information. Next question: What challenges have you faced in your previous projects and how did you overcome them?',
              timestamp: Date.now()
            }));
          }, 1000);
          break;
          
        case 'PAUSE_INTERVIEW':
          if (!testSessions.has(data.sessionId)) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: `Session ${data.sessionId} not found`,
              message: `Session ${data.sessionId} not found`
            }));
            return;
          }
          
          // Update session
          const pauseSession = testSessions.get(data.sessionId);
          pauseSession.isPaused = true;
          testSessions.set(data.sessionId, pauseSession);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'INTERVIEW_PAUSED',
            sessionId: data.sessionId
          }));
          break;
          
        case 'RESUME_INTERVIEW':
          if (!testSessions.has(data.sessionId)) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: `Session ${data.sessionId} not found`,
              message: `Session ${data.sessionId} not found`
            }));
            return;
          }
          
          // Update session
          const resumeSession = testSessions.get(data.sessionId);
          resumeSession.isPaused = false;
          testSessions.set(data.sessionId, resumeSession);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'INTERVIEW_RESUMED',
            sessionId: data.sessionId
          }));
          break;
          
        case 'END_INTERVIEW':
          if (!testSessions.has(data.sessionId)) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: `Session ${data.sessionId} not found`,
              message: `Session ${data.sessionId} not found`
            }));
            return;
          }
          
          // Clean up session
          testSessions.delete(data.sessionId);
          
          // Send confirmation with results URL
          ws.send(JSON.stringify({
            type: 'INTERVIEW_ENDED',
            sessionId: data.sessionId,
            resultsUrl: `https://example.com/results/${data.sessionId}`
          }));
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Unknown message type',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Failed to process message',
        message: 'Failed to process message'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});
```

### Phase 3: Update WebSocket Tests

Update the WebSocket test file (`tests/api/websocket.test.js`) to align with server implementation:

```javascript
// Wait for welcome message
const response = await webSocketClient.waitForMessage('SESSION_CREATED');

runner.assert(response.sessionId, 'Should receive session ID');
sessionId = response.sessionId;

// Wait for first AI message (which comes automatically)
const firstMessage = await webSocketClient.waitForMessage('AI_MESSAGE');
runner.assert(firstMessage.text, 'Should receive first question');
```

### Phase 4: Create Dedicated WebSocket Test Server Script

For more complex tests, create a dedicated `websocket-test-server.js` file that extends `simple-test-server.js` but with more comprehensive WebSocket support.

## Test Validation Strategy

1. Run individual WebSocket tests first to isolate issues:
   ```bash
   NODE_ENV=test node tests/api/websocket.test.js
   ```

2. Implement incremental fixes:
   - First fix the connection issue (port mismatch)
   - Then address message type discrepancies
   - Finally implement proper session handling

3. Add trace logging to the WebSocket client:
   ```javascript
   // Add debug logging
   console.log(`[${new Date().toISOString()}] Connecting to WebSocket: ${this.url}`);
   ```

4. Create a step-by-step validation script to verify each component of the WebSocket implementation independently.