/**
 * Simplified routes for testing
 * Includes just the endpoints required for the tests
 */

import * as openai from './test-openai.js';
import * as elevenlabs from './test-elevenlabs.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'test-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, 'test-upload-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/**
 * Register test-specific routes
 */
export async function registerTestRoutes(app) {
  // Initialize APIs
  await openai.initOpenAI();
  await elevenlabs.initElevenlabs();
  
  // ElevenLabs TTS API endpoints
  app.get('/api/tts/voices', async (req, res) => {
    try {
      console.log('Fetching ElevenLabs voices...');
      
      // If we're in test mode, always return mock voices for stability
      if (process.env.NODE_ENV === 'test') {
        console.log('Using mock voice data for testing');
        return res.json({
          voices: [
            {
              voice_id: "9BWtsMINqrJLrRacOk9x",
              id: "9BWtsMINqrJLrRacOk9x",
              name: "Antonio",
              category: "premium"
            },
            {
              voice_id: "TxGEqnHWrfWFTfGW9XjX",
              id: "TxGEqnHWrfWFTfGW9XjX",
              name: "Rachel",
              category: "premium"
            },
            {
              voice_id: "VR6AewLTigWG4xSOukaG",
              id: "VR6AewLTigWG4xSOukaG",
              name: "Daniel",
              category: "premium"
            }
          ],
          available: true
        });
      }
      
      const voices = await elevenlabs.getAllVoices();
      
      // Log the structure to debug
      if (voices && voices.length > 0) {
        console.log('Voice structure (first voice):', JSON.stringify(voices[0]));
        console.log(`Fetched ${voices.length} ElevenLabs voices`);
      } else {
        console.log('No voices returned from ElevenLabs');
      }
      
      res.json({ 
        voices: voices.map(v => ({ 
          id: v.voice_id || v.id, 
          voice_id: v.voice_id || v.id,
          name: v.name, 
          category: v.category || 'premium' 
        })),
        available: true
      });
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      
      // Fall back to mock data if there's an error and we're testing
      if (process.env.NODE_ENV === 'test') {
        console.log('Falling back to mock voice data due to error');
        return res.json({
          voices: [
            {
              voice_id: "9BWtsMINqrJLrRacOk9x",
              id: "9BWtsMINqrJLrRacOk9x",
              name: "Antonio",
              category: "premium"
            }
          ],
          available: true
        });
      }
      
      res.status(500).json({ error: error.message, available: false });
    }
  });
  
  app.get('/api/tts/voices/:id', async (req, res) => {
    try {
      console.log(`Fetching voice details for ID: ${req.params.id}`);
      const { id } = req.params;
      
      // If we're in test mode, always return a successful mock response
      if (process.env.NODE_ENV === 'test') {
        console.log('Using mock voice data for testing');
        return res.json({
          voice_id: id,
          id: id,
          name: "Test Voice",
          category: "premium"
        });
      }
      
      const voice = await elevenlabs.getVoiceByName(id);
      
      if (!voice) {
        console.log(`Voice with ID ${id} not found`);
        
        // Look for the voice in our mocked data for testing
        const mockedVoice = elevenlabs.voices.find(v => 
          (v.voice_id === id || v.id === id || v.name === id)
        );
        
        if (mockedVoice) {
          console.log(`Found voice in mock data: ${mockedVoice.name}`);
          return res.json({
            voice_id: mockedVoice.voice_id || mockedVoice.id,
            id: mockedVoice.voice_id || mockedVoice.id,
            name: mockedVoice.name,
            category: mockedVoice.category || 'premium'
          });
        }
        
        return res.status(404).json({ error: 'Voice not found' });
      }
      
      res.json({
        voice_id: voice.voice_id || voice.id,
        id: voice.voice_id || voice.id,
        name: voice.name,
        category: voice.category || 'premium'
      });
    } catch (error) {
      console.error('Error fetching ElevenLabs voice:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/tts/models', async (req, res) => {
    try {
      console.log('Fetching ElevenLabs models...');
      
      // If we're in test mode, always return a mock response for stability
      if (process.env.NODE_ENV === 'test') {
        console.log('Using mock models data for testing');
        return res.json({ 
          models: [
            {
              id: 'eleven_monolingual_v1',
              model_id: 'eleven_monolingual_v1',
              name: 'Monolingual v1',
              description: 'Primary TTS model for English',
              features: {
                tts: true,
                vc: false,
                style: false
              }
            },
            {
              id: 'eleven_multilingual_v2',
              model_id: 'eleven_multilingual_v2',
              name: 'Multilingual v2',
              description: 'Supports multiple languages',
              features: {
                tts: true,
                vc: false,
                style: true
              }
            }
          ]
        });
      }
      
      const models = await elevenlabs.getModels();
      console.log(`Fetched ${models.length} ElevenLabs models`);
      
      res.json({ 
        models: models.map(m => ({
          id: m.model_id,
          model_id: m.model_id,
          name: m.name || 'Unknown',
          description: m.description || 'No description available',
          features: {
            tts: m.can_do_text_to_speech || false,
            vc: m.can_do_voice_conversion || false,
            style: m.can_use_style || false
          }
        }))
      });
    } catch (error) {
      console.error('Error fetching ElevenLabs models:', error);
      
      // Fall back to mock data if there's an error and we're testing
      if (process.env.NODE_ENV === 'test') {
        console.log('Falling back to mock models data due to error');
        return res.json({ 
          models: [
            {
              id: 'eleven_monolingual_v1',
              model_id: 'eleven_monolingual_v1',
              name: 'Monolingual v1',
              description: 'Primary TTS model for English',
              features: {
                tts: true,
                vc: false,
                style: false
              }
            }
          ]
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/tts/generate', async (req, res) => {
    try {
      console.log('Received TTS request:', JSON.stringify(req.body));
      
      // If we're in test mode, always return a successful mock response
      if (process.env.NODE_ENV === 'test') {
        console.log('Using mock TTS data for testing');
        return res.json({
          url: `https://example.com/audio/test-${Date.now()}.mp3`,
          success: true
        });
      }
      
      // Check body structure
      const { text, voiceId, options } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required for text-to-speech conversion' });
      }
      
      if (!voiceId) {
        return res.status(400).json({ error: 'Voice ID is required for text-to-speech conversion' });
      }
      
      try {
        const result = await elevenlabs.textToSpeech(text, voiceId, options);
        console.log('TTS result:', result);
        
        if (!result || !result.url) {
          throw new Error('No valid URL returned from ElevenLabs');
        }
        
        res.json({
          url: result.url,
          success: true
        });
      } catch (ttsError) {
        console.error('ElevenLabs TTS error:', ttsError);
        
        // If we have an error in production, try a fallback to a mock for testing purposes
        console.log('Using fallback mock URL due to ElevenLabs error');
        res.json({
          url: `https://example.com/audio/fallback-${Date.now()}.mp3`,
          success: false,
          error: ttsError.message
        });
      }
    } catch (error) {
      console.error('Error handling TTS request:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // File upload endpoint for recordings
  app.post('/api/upload-recording', upload.single('file'), (req, res) => {
    try {
      // This is a mock implementation for testing
      console.log('Processing video upload request');
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log(`File uploaded to: ${req.file.path}`);
      
      // In a real implementation, we would process the file upload and store it
      // For testing, we just return a success response with a mock URL
      const recordingUrl = `https://example.com/recordings/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        recordingUrl
      });
    } catch (error) {
      console.error('Error uploading recording:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Interview management endpoints
  app.post('/api/interviews', (req, res) => {
    try {
      const { jobDescription, skills, interviewType, difficulty } = req.body;
      
      // Create a mock interview object
      const interview = {
        id: Math.floor(Math.random() * 1000),
        jobDescription,
        skills,
        interviewType,
        difficulty,
        status: 'in_progress',
        recordingUrl: null,
        duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(interview);
    } catch (error) {
      console.error('Error creating interview:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/interviews/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      // Create a mock interview object for the given ID
      // In a real implementation, we would fetch this from the database
      const interview = {
        id: parseInt(id, 10),
        jobDescription: "Test job description",
        skills: ["JavaScript", "Node.js"],
        interviewType: "technical",
        difficulty: "intermediate",
        status: 'in_progress',
        recordingUrl: null, // This will be updated later
        duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.json(interview);
    } catch (error) {
      console.error('Error fetching interview:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch('/api/interviews/:id/recording', (req, res) => {
    try {
      const { id } = req.params;
      const { recordingUrl } = req.body;
      
      if (!recordingUrl) {
        return res.status(400).json({ error: 'Missing recordingUrl' });
      }
      
      // In a real implementation, we would update the interview in the database
      // For testing, we just return a success response with the updated interview
      const updatedInterview = {
        id: parseInt(id, 10),
        recordingUrl,
        status: 'completed',
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedInterview);
    } catch (error) {
      console.error('Error updating interview recording:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Job description analysis endpoint
  app.post('/api/analyze-job', async (req, res) => {
    try {
      console.log('Analyzing job description...');
      const { jobDescription } = req.body;
      
      if (!jobDescription) {
        return res.status(400).json({ error: 'Missing job description' });
      }
      
      // If we're in test mode, always return a successful mock response
      if (process.env.NODE_ENV === 'test') {
        console.log('Using mock job analysis data for testing');
        return res.json({
          skills: ["JavaScript", "React", "Node.js", "TypeScript", "MongoDB"],
          role: "Full Stack Developer",
          seniority: "Mid-Senior",
          requiredExperience: "3-5 years",
          requiredEducation: "Bachelor's degree or equivalent experience",
          jobType: "Full-time",
          companySize: "Medium",
          industry: "Technology"
        });
      }
      
      try {
        const analysis = await openai.analyzeJobDescription(jobDescription);
        console.log('Job analysis result:', analysis);
        res.json(analysis);
      } catch (analysisError) {
        console.error('OpenAI analysis error:', analysisError);
        
        // If we have an error, fall back to basic skill extraction
        const simpleSkills = extractBasicSkills(jobDescription);
        console.log('Falling back to basic skill extraction:', simpleSkills);
        
        res.json({
          skills: simpleSkills,
          role: "Software Developer",
          seniority: "Mid-level",
          error: analysisError.message
        });
      }
    } catch (error) {
      console.error('Error analyzing job description:', error);
      res.status(500).json({ error: error.message });
    }
  });

// Basic skills extraction as a fallback if OpenAI fails
function extractBasicSkills(jobDescription) {
  // Common tech skills to look for
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C#", "PHP", "Ruby", "Go", 
    "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask",
    "MongoDB", "PostgreSQL", "MySQL", "SQL Server", "Redis", "AWS", "Azure", 
    "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "REST API", "GraphQL"
  ];
  
  // Simple regex-based extraction
  const skills = commonSkills.filter(skill => {
    const regex = new RegExp(`\\b${skill}\\b`, 'i');
    return regex.test(jobDescription);
  });
  
  // If no skills found, return some generic ones
  return skills.length > 0 ? skills : ["JavaScript", "Web Development", "Programming"];
}
  
  // Chat completion endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Missing or invalid messages' });
      }
      
      console.log('Chat completion request received, processing...');
      
      // If we're in test mode, always return a successful mock response
      if (process.env.NODE_ENV === 'test') {
        console.log('Using mock chat completion for testing');
        
        // Look for the last user message to generate an appropriate response
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
        
        // Generate a contextual mock response based on the last message content
        let mockResponse;
        if (lastUserMessage.toLowerCase().includes('introduce')) {
          mockResponse = "Hello! I'm your AI interviewer. I'll be asking you technical questions about web development and evaluating your responses.";
        } else if (lastUserMessage.toLowerCase().includes('javascript') || lastUserMessage.toLowerCase().includes('react')) {
          mockResponse = "That's a good answer about JavaScript. Can you tell me more about your experience with React hooks and state management?";
        } else if (lastUserMessage.toLowerCase().includes('experience')) {
          mockResponse = "Thanks for sharing your experience. Now let's move on to a more specific technical question. How would you optimize the performance of a React application?";
        } else {
          mockResponse = "That's an interesting perspective. Let's continue with the next question. Can you explain the difference between REST and GraphQL APIs?";
        }
        
        return res.json({ completion: mockResponse });
      }
      
      try {
        const completion = await openai.generateChatCompletion(messages);
        
        // Check if the completion is null (error) or a string (success)
        if (completion === null) {
          throw new Error('Failed to generate chat completion');
        }
        
        res.json({ completion });
      } catch (chatError) {
        console.error('OpenAI chat completion error:', chatError);
        
        // Provide a generic fallback response if the API fails
        res.json({ 
          completion: "I understand your point. Let's move on to the next question about your technical skills.",
          error: chatError.message 
        });
      }
    } catch (error) {
      console.error('Error handling chat completion request:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
}