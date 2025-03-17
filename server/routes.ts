import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { setupSocketHandlers } from "./socket";
import { analyzeJobDescription, generateInterviewResults } from "./openai";
import { uploadToS3 } from "./s3";
import { connectToMongoDB, initializeCounters } from "./mongodb";
import * as path from "path";
import * as fs from "fs";
import { getAllVoices, getVoiceByName, textToSpeech, getModels } from "./elevenlabs-service";

// Configure multer for memory storage (for S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Connect to MongoDB first
  console.log("Connecting to MongoDB...");
  try {
    await connectToMongoDB();
    console.log("MongoDB connection and initialization successful");
  } catch (error) {
    console.error("Failed to connect to MongoDB or initialize counters:", error);
    throw error; // This will crash the server if MongoDB setup fails
  }

  // Set up HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  console.log("Setting up WebSocket server on path: /ws");
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false
  });
  
  // Set up WebSocket handlers
  setupSocketHandlers(wss, storage);
  
  // API routes
  app.post('/api/analyze-job-description', async (req, res) => {
    try {
      const { jobDescription } = req.body;
      
      if (!jobDescription) {
        return res.status(400).json({ message: 'Job description is required' });
      }
      
      console.log('Analyzing job description...');
      const analysis = await analyzeJobDescription(jobDescription);
      console.log('Job description analysis complete');
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing job description:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ message: 'Failed to analyze job description' });
    }
  });
  
  // Create a new interview
  app.post('/api/interviews', async (req, res) => {
    try {
      console.log('Creating new interview with data:', JSON.stringify(req.body, null, 2));
      const { jobDescription, skills, interviewType, difficulty } = req.body;
      
      if (!jobDescription || !skills || !interviewType || !difficulty) {
        console.log('Missing required fields for interview creation');
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Create interview in storage
      console.log('Creating interview in storage...');
      const interview = await storage.createInterview({
        userId: null, // No authentication for simplicity
        jobDescription,
        skills,
        interviewType,
        difficulty
      });
      
      console.log('Interview created successfully:', JSON.stringify(interview, null, 2));
      res.status(201).json(interview);
    } catch (error) {
      console.error('Error creating interview:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else {
        console.error('Unknown error type:', typeof error);
      }
      res.status(500).json({ message: 'Failed to create interview' });
    }
  });
  
  // Upload interview recording with comprehensive checkpoints
  app.post('/api/interviews/recording', upload.single('recording'), async (req, res) => {
    console.log('[CHECKPOINT:UPLOAD_REQUEST] Received recording upload request');
    
    try {
      const interviewId = req.body.interviewId;
      const file = req.file;
      
      if (!interviewId) {
        console.error('[CHECKPOINT:UPLOAD_ERROR] Missing interview ID');
        return res.status(400).json({ message: 'Missing interview ID' });
      }
      
      if (!file) {
        console.error('[CHECKPOINT:UPLOAD_ERROR] No recording file in request');
        return res.status(400).json({ message: 'Missing recording file' });
      }
      
      console.log(`[CHECKPOINT:UPLOAD_VERIFIED] Received valid upload request for interview: ${interviewId}`);
      console.log(`[CHECKPOINT:UPLOAD_FILE_INFO] File size: ${file.size} bytes, mimetype: ${file.mimetype}`);
      
      // Upload file to S3
      const key = `interviews/${interviewId}/recording-${Date.now()}.webm`;
      console.log(`[CHECKPOINT:S3_UPLOAD_PREPARING] Preparing to upload recording to S3 with key: ${key}`);
      
      const s3Url = await uploadToS3(file.buffer, key, 'video/webm');
      console.log(`[CHECKPOINT:S3_UPLOAD_COMPLETE] Successfully uploaded to S3, URL generated`);
      
      // Update interview with S3 URL
      console.log(`[CHECKPOINT:DB_UPDATE_RECORDING] Updating interview ${interviewId} with recording URL`);
      await storage.updateInterviewRecording(parseInt(interviewId), s3Url);
      console.log(`[CHECKPOINT:DB_UPDATE_RECORDING_SUCCESS] Successfully updated recording URL in database`);
      
      res.json({ 
        message: 'Recording uploaded successfully', 
        url: s3Url,
        success: true,
        interviewId
      });
      console.log(`[CHECKPOINT:UPLOAD_SUCCESS] Recording upload workflow completed successfully`);
    } catch (error: any) {
      console.error('[CHECKPOINT:UPLOAD_FAILED] Error uploading recording:', error.message);
      console.error('[CHECKPOINT:UPLOAD_ERROR_STACK]', error.stack);
      
      // Structured error response
      const errorResponse = {
        message: 'Failed to upload recording',
        error: error.message,
        step: error.message.includes('S3') ? 'S3_UPLOAD' : 
              error.message.includes('database') ? 'DATABASE_UPDATE' : 'UNKNOWN'
      };
      
      res.status(500).json(errorResponse);
    }
  });
  
  // Generate interview results
  app.post('/api/interviews/:id/generate-results', async (req, res) => {
    try {
      const interviewId = parseInt(req.params.id);
      const { messages, duration } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'Messages are required' });
      }
      
      // Get the interview
      const interview = await storage.getInterview(interviewId);
      
      if (!interview) {
        return res.status(404).json({ message: 'Interview not found' });
      }
      
      // Update duration
      await storage.updateInterviewDuration(interviewId, duration);
      
      // Store messages
      for (const message of messages) {
        await storage.createMessage({
          interviewId,
          sender: message.sender,
          content: message.text
        });
      }
      
      // Generate results
      const results = await generateInterviewResults(interview, messages);
      
      // Store results
      await storage.createResult({
        interviewId,
        overallRating: results.overallRating,
        technicalProficiency: results.technicalProficiency,
        skillRatings: results.skillRatings,
        feedback: results.feedback
      });
      
      // Update interview status
      await storage.updateInterviewStatus(interviewId, 'completed');
      
      res.json({ message: 'Results generated successfully' });
    } catch (error) {
      console.error('Error generating results:', error);
      res.status(500).json({ message: 'Failed to generate results' });
    }
  });
  
  // Get all interviews (for admin dashboard)
  app.get('/api/interviews', async (req, res) => {
    try {
      console.log('[CHECKPOINT:ADMIN_LIST_INTERVIEWS] Fetching all interviews');
      const interviews = await storage.getAllInterviews();
      
      // For each interview, get the results if available
      const interviewsWithResults = await Promise.all(
        interviews.map(async (interview) => {
          let result = null;
          try {
            result = await storage.getResultByInterviewId(interview.id);
          } catch (error) {
            console.log(`[CHECKPOINT:ADMIN_RESULT_FETCH_ERROR] Failed to get results for interview ${interview.id}`);
          }
          
          return {
            ...interview,
            hasResults: !!result,
            overallRating: result ? result.overallRating : null
          };
        })
      );
      
      console.log(`[CHECKPOINT:ADMIN_LIST_INTERVIEWS_SUCCESS] Successfully fetched ${interviews.length} interviews`);
      res.json(interviewsWithResults);
    } catch (error) {
      console.error('[CHECKPOINT:ADMIN_LIST_INTERVIEWS_ERROR] Error fetching interviews:', error);
      res.status(500).json({ message: 'Failed to fetch interviews' });
    }
  });
  
  // Get a single interview by ID (for admin dashboard)
  app.get('/api/interviews/:id', async (req, res) => {
    try {
      const interviewId = parseInt(req.params.id);
      console.log(`[CHECKPOINT:ADMIN_GET_INTERVIEW] Fetching interview ${interviewId}`);
      
      const interview = await storage.getInterview(interviewId);
      
      if (!interview) {
        console.log(`[CHECKPOINT:ADMIN_GET_INTERVIEW_NOT_FOUND] Interview ${interviewId} not found`);
        return res.status(404).json({ message: 'Interview not found' });
      }
      
      console.log(`[CHECKPOINT:ADMIN_GET_INTERVIEW_SUCCESS] Successfully fetched interview ${interviewId}`);
      res.json(interview);
    } catch (error) {
      console.error(`[CHECKPOINT:ADMIN_GET_INTERVIEW_ERROR] Error fetching interview:`, error);
      res.status(500).json({ message: 'Failed to fetch interview' });
    }
  });

  // Get interview results
  app.get('/api/interviews/:id/results', async (req, res) => {
    try {
      const interviewId = parseInt(req.params.id);
      
      // Get the result
      const result = await storage.getResultByInterviewId(interviewId);
      
      if (!result) {
        return res.status(404).json({ message: 'Results not found' });
      }
      
      // Get the interview for duration
      const interview = await storage.getInterview(interviewId);
      
      if (!interview) {
        return res.status(404).json({ message: 'Interview not found' });
      }
      
      // Cast the result to the proper types
      const typedResult = result as unknown as {
        id: number;
        overallRating: number;
        technicalProficiency: string;
        skillRatings: Array<{name: string; score: number}>;
        feedback: {
          strengths: string[];
          improvements: string[];
          learningPaths: string[];
        }
      };
      
      res.json({
        id: typedResult.id,
        overallRating: typedResult.overallRating,
        technicalProficiency: typedResult.technicalProficiency,
        duration: interview.duration || 0,
        recordingUrl: interview.recordingUrl || null,
        skillRatings: typedResult.skillRatings,
        feedback: typedResult.feedback
      });
    } catch (error) {
      console.error('Error getting results:', error);
      res.status(500).json({ message: 'Failed to get results' });
    }
  });
  
  // Download interview report
  app.get('/api/interviews/:id/download-report', async (req, res) => {
    try {
      const interviewId = parseInt(req.params.id);
      
      // Get the result
      const result = await storage.getResultByInterviewId(interviewId);
      
      if (!result) {
        return res.status(404).json({ message: 'Results not found' });
      }
      
      // Get the interview
      const interview = await storage.getInterview(interviewId);
      
      if (!interview) {
        return res.status(404).json({ message: 'Interview not found' });
      }
      
      // Get the messages
      const messages = await storage.getMessagesByInterviewId(interviewId);
      
      // Generate PDF report (simplified - would use PDF generation library in production)
      // First cast the data to the proper types
      const typedResult = result as unknown as {
        overallRating: number;
        technicalProficiency: string;
        skillRatings: Array<{name: string; score: number}>;
        feedback: {
          strengths: string[];
          improvements: string[];
          learningPaths: string[];
        }
      };
      
      const report = `
      AI Interviewer Results
      =====================
      
      Overall Rating: ${typedResult.overallRating}/10
      Technical Proficiency: ${typedResult.technicalProficiency}
      Duration: ${interview.duration || 0} seconds
      
      Skills Assessment:
      ${typedResult.skillRatings.map(skill => `- ${skill.name}: ${skill.score}/10`).join('\n')}
      
      Strengths:
      ${typedResult.feedback.strengths.map(strength => `- ${strength}`).join('\n')}
      
      Areas for Improvement:
      ${typedResult.feedback.improvements.map(improvement => `- ${improvement}`).join('\n')}
      
      Recommended Learning Paths:
      ${typedResult.feedback.learningPaths.map(path => `- ${path}`).join('\n')}
      `;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="interview-report-${interviewId}.txt"`);
      res.send(report);
    } catch (error) {
      console.error('Error downloading report:', error);
      res.status(500).json({ message: 'Failed to download report' });
    }
  });

  // ElevenLabs Text-to-Speech endpoints
  // Get all available voices
  app.get('/api/tts/voices', async (req, res) => {
    try {
      console.log('[CHECKPOINT:TTS_GET_VOICES] Fetching available voices');
      
      if (!process.env.ELEVENLABS_API_KEY) {
        console.log('[CHECKPOINT:TTS_NO_API_KEY] Missing ElevenLabs API key');
        return res.status(500).json({ 
          message: 'ElevenLabs API key not configured', 
          available: false 
        });
      }
      
      const voices = await getAllVoices();
      console.log(`[CHECKPOINT:TTS_GET_VOICES_SUCCESS] Found ${voices.length} voices`);
      
      res.json({ 
        voices: voices.map(voice => ({
          id: voice.voice_id,
          name: voice.name || 'Unknown',
          category: voice.category || 'General'
        })),
        available: true
      });
    } catch (error: any) {
      console.error('[CHECKPOINT:TTS_GET_VOICES_ERROR]', error.message);
      res.status(500).json({ 
        message: 'Failed to fetch voices',
        error: error.message,
        available: false
      });
    }
  });
  
  // Get all available models for TTS
  app.get('/api/tts/models', async (req, res) => {
    try {
      console.log('[CHECKPOINT:TTS_GET_MODELS] Fetching available models');
      
      if (!process.env.ELEVENLABS_API_KEY) {
        console.log('[CHECKPOINT:TTS_NO_API_KEY] Missing ElevenLabs API key');
        return res.status(500).json({ 
          message: 'ElevenLabs API key not configured',
          available: false 
        });
      }
      
      const models = await getModels();
      console.log(`[CHECKPOINT:TTS_GET_MODELS_SUCCESS] Found ${models.length} models`);
      
      res.json({ 
        models: models.map(model => ({
          id: model.model_id,
          name: model.name || 'Unknown Model',
          description: model.description || '',
          features: {
            textToSpeech: model.can_do_text_to_speech || false,
            voiceConversion: model.can_do_voice_conversion || false,
            finetuning: model.can_be_finetuned || false
          }
        })),
        available: true
      });
    } catch (error: any) {
      console.error('[CHECKPOINT:TTS_GET_MODELS_ERROR]', error.message);
      res.status(500).json({ 
        message: 'Failed to fetch models',
        error: error.message,
        available: false
      });
    }
  });
  
  // Generate speech from text
  app.post('/api/tts/generate', async (req, res) => {
    try {
      const { text, voice, stability, similarityBoost, saveFile } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }
      
      if (!process.env.ELEVENLABS_API_KEY) {
        console.log('[CHECKPOINT:TTS_NO_API_KEY] Missing ElevenLabs API key');
        return res.status(500).json({ 
          message: 'ElevenLabs API key not configured',
          available: false
        });
      }
      
      console.log(`[CHECKPOINT:TTS_GENERATE] Generating speech for text (${text.length} chars) with voice: ${voice || 'default'}`);
      
      const result = await textToSpeech(
        text,
        voice || 'Rachel',
        {
          stability: stability !== undefined ? parseFloat(stability) : 0.5,
          similarityBoost: similarityBoost !== undefined ? parseFloat(similarityBoost) : 0.75,
          saveToFile: saveFile === true
        }
      );
      
      console.log('[CHECKPOINT:TTS_GENERATE_SUCCESS] Speech generated successfully');
      
      res.json({ 
        audioUrl: result.url,
        success: true
      });
    } catch (error: any) {
      console.error('[CHECKPOINT:TTS_GENERATE_ERROR]', error.message);
      res.status(500).json({ 
        message: 'Failed to generate speech',
        error: error.message,
        available: false
      });
    }
  });
  
  // Serve generated audio files
  app.get('/api/audio/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Audio file not found' });
      }
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.sendFile(filePath);
    } catch (error: any) {
      console.error('Error serving audio file:', error.message);
      res.status(500).json({ message: 'Failed to serve audio file' });
    }
  });

  return httpServer;
}
