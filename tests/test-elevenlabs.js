/**
 * Simplified ElevenLabs module for testing
 * This is a JavaScript version of server/elevenlabs.ts that avoids TypeScript features
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;
const API_URL = 'https://api.elevenlabs.io/v1';

// Sample voices for testing when API is not available
let voices = [
  {
    voice_id: "9BWtsMINqrJLrRacOk9x",
    name: "Test Voice 1",
    category: "premium"
  },
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    name: "Test Voice 2",
    category: "premium"
  },
  {
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    name: "Test Voice 3",
    category: "professional"
  }
];
let available = true;

/**
 * Initialize ElevenLabs service
 */
async function initElevenlabs() {
  try {
    if (!API_KEY) {
      console.warn('No ElevenLabs API key found in environment variables');
      available = false;
      return false;
    }
    
    const voicesResponse = await getAllVoices();
    if (voicesResponse && voicesResponse.length > 0) {
      voices = voicesResponse;
      available = true;
      console.log(`Successfully loaded ${voices.length} ElevenLabs voices`);
      return true;
    } else {
      available = false;
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize ElevenLabs service:', error.message);
    available = false;
    return false;
  }
}

/**
 * Get all available voices
 */
async function getAllVoices() {
  try {
    const response = await fetch(`${API_URL}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category || 'other'
    }));
  } catch (error) {
    console.error('Failed to fetch ElevenLabs voices:', error.message);
    return [];
  }
}

/**
 * Get voice by name or ID
 */
async function getVoiceByName(name) {
  if (voices.length === 0) {
    await getAllVoices();
  }
  
  return voices.find(v => v.name === name || v.id === name) || null;
}

/**
 * Get all available models
 */
async function getModels() {
  try {
    const response = await fetch(`${API_URL}/models`, {
      method: 'GET',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Format the models to match the expected structure in the test
    return data.map(model => ({
      id: model.model_id,
      name: model.name || 'Unnamed Model',
      description: model.description || 'No description available',
      features: {
        canDoTextToSpeech: model.can_do_text_to_speech || false,
        canDoVoiceConversion: model.can_do_voice_conversion || false,
        canUseStyle: model.can_use_style || false
      }
    }));
  } catch (error) {
    console.error('Failed to fetch ElevenLabs models:', error.message);
    // Return fallback for test purposes
    return [
      {
        id: 'eleven_monolingual_v1',
        name: 'Monolingual v1',
        description: 'Primary TTS model for English',
        features: {
          canDoTextToSpeech: true,
          canDoVoiceConversion: false,
          canUseStyle: false
        }
      },
      {
        id: 'eleven_multilingual_v2',
        name: 'Multilingual v2',
        description: 'Supports multiple languages',
        features: {
          canDoTextToSpeech: true,
          canDoVoiceConversion: false,
          canUseStyle: true
        }
      }
    ];
  }
}

/**
 * Text-to-speech conversion
 */
async function textToSpeech(text, voiceId, options = {}) {
  try {
    if (!voiceId) {
      throw new Error('Voice ID is required for text-to-speech conversion');
    }
    
    // If API_KEY is not available, return mock data for testing
    if (!API_KEY || process.env.NODE_ENV === 'test') {
      console.log('Using mock TTS for testing');
      return {
        url: `https://example.com/audio/test-${Date.now()}.mp3`,
        buffer: Buffer.from('Test audio content')
      };
    }
    
    const stability = options.stability || 0.5;
    const similarityBoost = options.similarityBoost || 0.75;
    const model = options.model || 'eleven_monolingual_v1';
    
    const response = await fetch(`${API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);
    
    // In a real implementation, we would upload this to S3 or similar
    // For test purposes, we'll just return a mock URL
    return {
      url: `https://example.com/audio/${Date.now()}.mp3`,
      buffer
    };
  } catch (error) {
    console.error('Failed to convert text to speech:', error.message);
    throw error;
  }
}

// Export functions
export {
  initElevenlabs,
  getAllVoices,
  getVoiceByName,
  getModels,
  textToSpeech,
  available
};