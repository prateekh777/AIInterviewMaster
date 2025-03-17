/**
 * WebSocket Test Script
 * Tests the WebSocket connection and basic communication patterns
 */

import WebSocket from 'ws';
import readline from 'readline';

// Setup readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default WebSocket URL (can be overridden via command line args)
let WS_URL = 'ws://localhost:5000/ws';
let TEST_MODE = 'interactive'; // 'interactive' or 'automated'

// Process command line arguments
process.argv.forEach((arg, index) => {
  if (arg === '--url' && process.argv[index + 1]) {
    WS_URL = process.argv[index + 1];
  }
  if (arg === '--mode' && process.argv[index + 1]) {
    TEST_MODE = process.argv[index + 1];
  }
});

console.log(`WebSocket Test Script`);
console.log(`Testing connection to: ${WS_URL}`);
console.log(`Mode: ${TEST_MODE}`);

/**
 * Test WebSocket connection
 */
async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to WebSocket at ${WS_URL}...`);
    
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log('WebSocket connection established successfully');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('Received message:', message);
          
          // If we're in automated test mode, process the response
          if (TEST_MODE === 'automated') {
            processAutomatedResponse(ws, message);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          console.log('Raw message:', data.toString());
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      if (TEST_MODE === 'interactive') {
        // Start interactive test session
        startInteractiveSession(ws);
      } else {
        // Start automated test sequence
        startAutomatedTestSequence(ws);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
      reject(error);
    });
  });
}

/**
 * Start interactive session for manual testing
 */
function startInteractiveSession(ws) {
  console.log('\n=== Interactive WebSocket Testing ===');
  console.log('Available commands:');
  console.log('  start <id> - Start an interview with optional ID');
  console.log('  msg <text> - Send a user message');
  console.log('  pause <id> - Pause the interview');
  console.log('  resume <id> - Resume the interview');
  console.log('  end <id> - End the interview');
  console.log('  quit - Close the connection and exit');
  console.log('  help - Show this help');
  
  let currentSessionId = null;
  
  rl.on('line', (input) => {
    const parts = input.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    try {
      switch (command) {
        case 'start':
          const interviewId = args ? parseInt(args, 10) : 0;
          console.log(`Starting interview with ID: ${interviewId}`);
          ws.send(JSON.stringify({
            type: 'START_INTERVIEW',
            interviewId: interviewId,
            jobDescription: "Test job description for WebSocket testing",
            skills: ["JavaScript", "Node.js", "WebSockets"],
            interviewType: "technical",
            difficulty: "intermediate"
          }));
          break;
          
        case 'msg':
          if (!currentSessionId) {
            console.log('No active session ID. Use the session ID from the start response.');
            console.log('Enter session ID:');
            rl.once('line', (sessionId) => {
              currentSessionId = sessionId.trim();
              sendUserMessage(ws, currentSessionId, args);
            });
          } else {
            sendUserMessage(ws, currentSessionId, args);
          }
          break;
          
        case 'pause':
          const pauseSessionId = args || currentSessionId;
          if (!pauseSessionId) {
            console.log('No session ID provided');
            return;
          }
          console.log(`Pausing interview session: ${pauseSessionId}`);
          ws.send(JSON.stringify({
            type: 'PAUSE_INTERVIEW',
            sessionId: pauseSessionId
          }));
          break;
          
        case 'resume':
          const resumeSessionId = args || currentSessionId;
          if (!resumeSessionId) {
            console.log('No session ID provided');
            return;
          }
          console.log(`Resuming interview session: ${resumeSessionId}`);
          ws.send(JSON.stringify({
            type: 'RESUME_INTERVIEW',
            sessionId: resumeSessionId
          }));
          break;
          
        case 'end':
          const endSessionId = args || currentSessionId;
          if (!endSessionId) {
            console.log('No session ID provided');
            return;
          }
          console.log(`Ending interview session: ${endSessionId}`);
          ws.send(JSON.stringify({
            type: 'END_INTERVIEW',
            sessionId: endSessionId
          }));
          break;
          
        case 'quit':
          console.log('Closing WebSocket connection...');
          ws.close();
          setTimeout(() => {
            rl.close();
            process.exit(0);
          }, 500);
          break;
          
        case 'help':
          console.log('Available commands:');
          console.log('  start <id> - Start an interview with optional ID');
          console.log('  msg <text> - Send a user message');
          console.log('  pause <id> - Pause the interview');
          console.log('  resume <id> - Resume the interview');
          console.log('  end <id> - End the interview');
          console.log('  quit - Close the connection and exit');
          console.log('  help - Show this help');
          break;
          
        default:
          console.log('Unknown command. Type "help" for available commands.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
  
  // Process server responses
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Capture session ID from server response
      if (message.type === 'SESSION_CREATED' && message.sessionId) {
        currentSessionId = message.sessionId;
        console.log(`Session ID set to: ${currentSessionId}`);
      }
    } catch (error) {
      // Error already logged in the main message handler
    }
  });
}

/**
 * Helper to send user message
 */
function sendUserMessage(ws, sessionId, text) {
  console.log(`Sending message in session ${sessionId}: ${text}`);
  ws.send(JSON.stringify({
    type: 'USER_MESSAGE',
    sessionId: sessionId,
    message: text
  }));
}

/**
 * Start automated test sequence
 */
function startAutomatedTestSequence(ws) {
  console.log('\n=== Automated WebSocket Testing ===');
  
  let step = 0;
  let sessionId = null;
  
  // Test Step 1: Start Interview
  setTimeout(() => {
    console.log('Test Step 1: Starting interview...');
    ws.send(JSON.stringify({
      type: 'START_INTERVIEW',
      interviewId: 0,
      jobDescription: "Test job description for automated WebSocket testing",
      skills: ["JavaScript", "Node.js", "WebSockets"],
      interviewType: "technical",
      difficulty: "intermediate"
    }));
  }, 500);
  
  // Process responses for automated testing
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'SESSION_CREATED' && message.sessionId) {
        sessionId = message.sessionId;
        step = 1; // Move to next step
        
        // Test Step 2: Send a user message
        setTimeout(() => {
          if (sessionId) {
            console.log('Test Step 2: Sending user message...');
            ws.send(JSON.stringify({
              type: 'USER_MESSAGE',
              sessionId: sessionId,
              message: "This is an automated test message. I have experience with JavaScript and WebSockets."
            }));
          }
        }, 1000);
      }
      
      if (message.type === 'AI_MESSAGE' && step === 1) {
        step = 2; // Move to next step
        
        // Test Step 3: Pause the interview
        setTimeout(() => {
          if (sessionId) {
            console.log('Test Step 3: Pausing interview...');
            ws.send(JSON.stringify({
              type: 'PAUSE_INTERVIEW',
              sessionId: sessionId
            }));
          }
        }, 1000);
      }
      
      if (message.type === 'INTERVIEW_PAUSED' && step === 2) {
        step = 3; // Move to next step
        
        // Test Step 4: Resume the interview
        setTimeout(() => {
          if (sessionId) {
            console.log('Test Step 4: Resuming interview...');
            ws.send(JSON.stringify({
              type: 'RESUME_INTERVIEW',
              sessionId: sessionId
            }));
          }
        }, 1000);
      }
      
      if (message.type === 'INTERVIEW_RESUMED' && step === 3) {
        step = 4; // Move to next step
        
        // Test Step 5: End the interview
        setTimeout(() => {
          if (sessionId) {
            console.log('Test Step 5: Ending interview...');
            ws.send(JSON.stringify({
              type: 'END_INTERVIEW',
              sessionId: sessionId
            }));
          }
        }, 1000);
      }
      
      if (message.type === 'INTERVIEW_ENDED' && step === 4) {
        step = 5; // Final step
        
        // Complete the test
        setTimeout(() => {
          console.log('Automated test sequence completed successfully');
          ws.close();
          process.exit(0);
        }, 1000);
      }
    } catch (error) {
      // Error already logged in the main message handler
    }
  });
  
  // Set a timeout for the entire automated test
  setTimeout(() => {
    console.log('Automated test timeout reached. Test incomplete.');
    console.log(`Completed ${step} of 5 steps.`);
    ws.close();
    process.exit(1);
  }, 30000); // 30 second timeout
}

/**
 * Process automated test responses
 */
function processAutomatedResponse(ws, message) {
  // This is handled by the message listener in startAutomatedTestSequence
}

/**
 * Run the test
 */
async function runTest() {
  try {
    await testWebSocketConnection();
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();