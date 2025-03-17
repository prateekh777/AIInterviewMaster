/**
 * Test-specific Express server
 * This standalone server is used for running tests without Vite interference
 * 
 * IMPORTANT: This server runs on port 5001 to avoid conflicts with the Vite dev server on port 5000.
 * The Vite dev server was intercepting HTTP requests from tests and returning HTML responses
 * instead of the expected JSON API responses, causing test failures.
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { WebSocketServer } from 'ws';

// Import test-specific modules instead of server modules
import { registerTestRoutes } from './test-routes.js';
import * as elevenlabs from './test-elevenlabs.js';
import * as openai from './test-openai.js';

// Setup Express server without Vite
async function setupTestServer() {
  const app = express();
  const PORT = 5001; // Different port than the dev server
  
  // Middleware
  app.use(express.json());
  app.use(cors());
  
  // Setup file upload middleware
  const upload = multer({ 
    dest: 'test-uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
  
  console.log('Initializing test server...');
  
  // Initialize OpenAI
  try {
    await openai.initOpenAI();
    console.log('OpenAI initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenAI:', error);
  }
  
  // Initialize ElevenLabs
  try {
    await elevenlabs.initElevenlabs();
    console.log('ElevenLabs initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ElevenLabs:', error);
  }
  
  // Register test routes
  await registerTestRoutes(app);
  
  // Create server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
  
  // Setup simple WebSocket server for testing
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
  
  return server;
}

// Export setup function
export { setupTestServer };

// If this file is run directly, start the server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  setupTestServer().catch(console.error);
}