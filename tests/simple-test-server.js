/**
 * Simplified test-specific Express server
 * This standalone server uses JavaScript modules specifically designed for testing
 * 
 * IMPORTANT: This server runs on port 5001 to avoid conflicts with the Vite dev server on port 5000.
 * The Vite dev server was intercepting HTTP requests from tests and returning HTML responses
 * instead of the expected JSON API responses, causing test failures.
 */

// Set environment to 'test' for the test server
process.env.NODE_ENV = 'test';
console.log('Setting NODE_ENV to "test" for predictable test responses');

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import { registerTestRoutes } from './test-routes.js';
import * as elevenlabs from './test-elevenlabs.js';

// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(process.cwd(), 'test-uploads'));
  },
  filename: function(req, file, cb) {
    cb(null, 'test-upload-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const TEST_SERVER_PORT = 5001;

/**
 * Set up and start the test server
 */
async function setupTestServer() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
  
  console.log('Starting simplified test server on port 5001...');
  console.log('Waiting for test server to start...');
  
  console.log('Initializing test server...');
  
  // Initialize services
  try {
    // Initialize OpenAI (done when routes are registered)
    
    // Initialize ElevenLabs
    const elevenLabsAvailable = await elevenlabs.initElevenlabs();
    console.log(`ElevenLabs service initialized: ${elevenLabsAvailable ? 'available' : 'unavailable'}`);
    
    // Add status endpoint to check server is running
    app.get('/api/status', (req, res) => {
      res.json({
        status: 'ok',
        server: 'test-server',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        port: TEST_SERVER_PORT
      });
    });
    
    // Register all routes
    await registerTestRoutes(app);
    
    // TTS endpoints
    app.get('/api/tts/voices', async (req, res) => {
      try {
        const voices = await elevenlabs.getAllVoices();
        res.json({ 
          voices: voices.map(voice => ({ id: voice.voice_id, name: voice.name })),
          available: true
        });
      } catch (error) {
        console.error('Error getting voices:', error);
        res.status(500).json({ error: error.message, available: false });
      }
    });
    
    app.post('/api/tts/generate', async (req, res) => {
      try {
        const { text, voiceId, options } = req.body;
        
        if (!text) {
          return res.status(400).json({ error: 'Missing text' });
        }
        
        const result = await elevenlabs.textToSpeech(text, voiceId, options);
        res.json({ url: result.url });
      } catch (error) {
        console.error('Error generating speech:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Start server
    app.listen(TEST_SERVER_PORT, () => {
      console.log(`Test server running on port ${TEST_SERVER_PORT}`);
    });
  } catch (error) {
    console.error('Error setting up test server:', error);
    process.exit(1);
  }
}

setupTestServer();