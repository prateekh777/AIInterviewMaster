/**
 * WebSocket Communication Tests
 * Verifies the WebSocket communication works correctly
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TestRunner } from '../utils/test-runner.js';
import { WebSocketClient } from '../utils/websocket-client.js';
import { ApiClient } from '../utils/api-client.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  const testRunner = new TestRunner('WebSocket Communication Tests');
  const apiClient = new ApiClient();
  let webSocketClient;

  await testRunner.run(async (runner) => {
    let interviewId;
    
    // Create a test interview to use for the WebSocket session
    await runner.test('Should create a test interview', async () => {
      const interviewData = {
        jobDescription: "Senior React Developer needed for a fintech startup. Must have 3+ years of experience with React, Redux, and TypeScript. Knowledge of financial systems is a plus.",
        skills: ["React", "Redux", "TypeScript", "JavaScript"],
        interviewType: "technical",
        difficulty: "senior"
      };
      
      const response = await apiClient.post('/api/interviews', interviewData);
      interviewId = response.id;
      
      runner.assert(interviewId, 'Should create an interview and return its ID');
      console.log(`Created test interview with ID: ${interviewId}`);
    });
    
    // Connect to WebSocket
    await runner.test('Should connect to WebSocket', async () => {
      webSocketClient = new WebSocketClient();
      await webSocketClient.connect();
      
      runner.assert(webSocketClient.connected, 'Should establish WebSocket connection');
    });
    
    // Start interview session
    let sessionId;
    
    await runner.test('Should start an interview session', async () => {
      if (!interviewId) {
        throw new Error('No interview ID available for testing');
      }
      
      webSocketClient.send({
        type: 'START_INTERVIEW',
        interviewId: interviewId
      });
      
      // Wait for welcome message
      const response = await webSocketClient.waitForMessage('WELCOME');
      
      runner.assert(response.sessionId, 'Should receive session ID');
      runner.assert(response.firstQuestion, 'Should receive first question');
      
      sessionId = response.sessionId;
      console.log(`Interview session started with ID: ${sessionId}`);
    });
    
    // Send user message
    await runner.test('Should send a user message and receive AI response', async () => {
      if (!sessionId) {
        throw new Error('No session ID available for testing');
      }
      
      // Register handler for typing indicator
      let typingReceived = false;
      webSocketClient.on('TYPING', () => {
        typingReceived = true;
      });
      
      // Send a user message
      webSocketClient.send({
        type: 'USER_MESSAGE',
        sessionId: sessionId,
        message: "I have 5 years of experience with React and TypeScript, particularly in building financial dashboards and trading platforms."
      });
      
      // Wait for AI response
      const response = await webSocketClient.waitForMessage('AI_MESSAGE', 15000); // Increased timeout for AI processing
      
      runner.assert(response.message, 'Should receive AI message content');
      runner.assert(typingReceived, 'Should receive typing indicator');
      
      console.log(`Received AI response: ${response.message.substring(0, 50)}...`);
    });
    
    // Test pausing interview
    await runner.test('Should pause and resume the interview', async () => {
      if (!sessionId) {
        throw new Error('No session ID available for testing');
      }
      
      // Pause interview
      webSocketClient.send({
        type: 'PAUSE_INTERVIEW',
        sessionId: sessionId
      });
      
      // Wait for pause confirmation
      const pauseResponse = await webSocketClient.waitForMessage('INTERVIEW_PAUSED');
      
      runner.assert(pauseResponse.sessionId === sessionId, 'Should receive pause confirmation for correct session');
      
      // Resume interview
      webSocketClient.send({
        type: 'RESUME_INTERVIEW',
        sessionId: sessionId
      });
      
      // Wait for resume confirmation
      const resumeResponse = await webSocketClient.waitForMessage('INTERVIEW_RESUMED');
      
      runner.assert(resumeResponse.sessionId === sessionId, 'Should receive resume confirmation for correct session');
    });
    
    // Test error handling
    await runner.test('Should handle invalid requests with proper error messages', async () => {
      // Send invalid session ID
      webSocketClient.send({
        type: 'USER_MESSAGE',
        sessionId: 'invalid-session-id',
        message: "This message should trigger an error."
      });
      
      // Wait for error response
      const errorResponse = await webSocketClient.waitForMessage('ERROR');
      
      runner.assert(errorResponse.message, 'Should receive error message');
      console.log(`Received error message: ${errorResponse.message}`);
    });
    
    // End interview session
    await runner.test('Should end the interview session', async () => {
      if (!sessionId) {
        throw new Error('No session ID available for testing');
      }
      
      webSocketClient.send({
        type: 'END_INTERVIEW',
        sessionId: sessionId
      });
      
      // Wait for end confirmation
      const endResponse = await webSocketClient.waitForMessage('INTERVIEW_ENDED');
      
      runner.assert(endResponse.sessionId === sessionId, 'Should receive end confirmation for correct session');
      runner.assert(endResponse.resultsUrl, 'Should receive URL to view results');
      
      console.log(`Interview ended, results URL: ${endResponse.resultsUrl}`);
    });
    
    // Clean up WebSocket connection
    await runner.test('Should disconnect from WebSocket', async () => {
      if (webSocketClient) {
        await webSocketClient.close();
      }
    });
  });
}

runTests().catch(console.error);