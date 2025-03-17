/**
 * ElevenLabs Text-to-Speech service
 * Provides high-quality voice synthesis with minimal latency
 */
import fs from 'fs';
import path from 'path';
import { log } from './vite';
import { ElevenLabsClient } from 'elevenlabs';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

// Response types to match ElevenLabs API
interface ElevenLabsVoiceResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    category?: string;
  }>;
}

interface TtsOptions {
  stability?: number;
  similarityBoost?: number;
  model?: string;
  saveToFile?: boolean;
}

// Define the ElevenLabs model interface
interface ElevenLabsModel {
  model_id: string;
  name: string;
  description?: string;
  can_be_finetuned?: boolean;
  can_do_text_to_speech?: boolean;
  can_do_voice_conversion?: boolean;
  can_use_style?: boolean;
  can_use_speaker_boost?: boolean;
  serves_pro_voices?: boolean;
  token_cost_factor?: number;
  requires_alpha_access?: boolean;
  max_characters_request_free_user?: number;
  max_characters_request_subscribed_user?: number;
  maximum_text_length_per_request?: number;
}

// Cache for voice IDs to avoid repeated API calls
let voiceCache: ElevenLabsVoice[] | null = null;

// Initialize the ElevenLabs client
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

/**
 * Initialize the ElevenLabs service and cache available voices
 */
export async function initElevenLabs(): Promise<boolean> {
  try {
    log('Initializing ElevenLabs TTS service', 'elevenlabs');
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('Missing ELEVENLABS_API_KEY environment variable');
    }
    
    // Pre-fetch available voices to cache them
    await getAllVoices();
    if (voiceCache) {
      log(`Successfully loaded ${voiceCache.length} ElevenLabs voices`, 'elevenlabs');
    }
    
    return true;
  } catch (error: any) {
    log(`ElevenLabs initialization error: ${error?.message || 'Unknown error'}`, 'elevenlabs');
    return false;
  }
}

/**
 * Get a voice by name or ID
 */
export async function getVoiceByName(name: string): Promise<ElevenLabsVoice | null> {
  try {
    // Load voices if not cached
    if (!voiceCache) {
      await getAllVoices();
    }
    
    if (!voiceCache || voiceCache.length === 0) {
      return null;
    }
    
    // Find voice by name (case-insensitive) or ID
    const voice = voiceCache.find(v => 
      (v.name && v.name.toLowerCase() === name.toLowerCase()) ||
      v.voice_id === name
    );
    
    return voice || null;
  } catch (error: any) {
    log(`Error getting voice by name: ${error?.message || 'Unknown error'}`, 'elevenlabs');
    return null;
  }
}

/**
 * Get all available voices
 */
export async function getAllVoices(): Promise<ElevenLabsVoice[]> {
  try {
    // Use cached voices if available
    if (voiceCache) {
      return voiceCache;
    }
    
    // Fetch voices from ElevenLabs API
    const response = await client.voices.getAll();
    
    // API response comes with a 'voices' array
    if (!response || !Array.isArray(response.voices)) {
      log('Invalid voice response format from ElevenLabs API', 'elevenlabs');
      return [];
    }
    
    // Format into our voice cache structure with required name field
    voiceCache = response.voices
      .filter(voice => voice.name && voice.voice_id) // Filter out any voices with missing required fields
      .map(voice => ({
        voice_id: voice.voice_id,
        name: voice.name || `Voice ${voice.voice_id.substring(0, 6)}`, // Fallback name if somehow undefined
        category: voice.category
      }));
    
    return voiceCache || [];
  } catch (error: any) {
    log(`Error getting all voices: ${error?.message || 'Unknown error'}`, 'elevenlabs');
    return [];
  }
}

/**
 * Text-to-speech conversion
 * Returns a URL to the generated audio
 */
export async function textToSpeech(
  text: string, 
  voiceId: string = 'Rachel', // Default voice
  options: TtsOptions = {}
): Promise<{ url: string, buffer?: Buffer }> {
  try {
    const {
      stability = 0.5,
      similarityBoost = 0.75,
      model = 'eleven_multilingual_v2',
      saveToFile = false
    } = options;
    
    // Validate voice exists
    let targetVoice = voiceId;
    if (!voiceId.match(/^[0-9a-zA-Z]{20,}$/)) {
      // If not a voice ID, look up by name
      const voice = await getVoiceByName(voiceId);
      if (!voice) {
        log(`Voice "${voiceId}" not found, using default voice`, 'elevenlabs');
        targetVoice = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" voice ID
      } else {
        targetVoice = voice.voice_id;
      }
    }
    
    // Generate audio from text
    log(`Generating TTS for text (${text.length} chars) with voice ${targetVoice}`, 'elevenlabs');
    
    const audioStream = await client.generate({
      voice: targetVoice,
      text: text,
      model_id: model,
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost
      }
    });
    
    // Convert the stream to a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    
    if (saveToFile) {
      // Ensure uploads directory exists
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Save to file
      const fileName = `speech_${Date.now()}.mp3`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, audioBuffer);
      
      return { 
        url: `/api/audio/${fileName}`,
        buffer: audioBuffer
      };
    }
    
    // Create a data URL for direct use
    const base64Audio = audioBuffer.toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    return { url: dataUrl, buffer: audioBuffer };
  } catch (error: any) {
    log(`TTS error: ${error?.message || 'Unknown error'}`, 'elevenlabs');
    throw error;
  }
}

/**
 * Get all available models
 * Returns a list of ElevenLabs TTS models with their capabilities
 */
export async function getModels(): Promise<ElevenLabsModel[]> {
  try {
    log('Fetching available ElevenLabs models', 'elevenlabs');
    
    // Fetch models from ElevenLabs API
    const apiModels = await client.models.getAll();
    
    if (!apiModels || !Array.isArray(apiModels)) {
      log('Invalid model response format from ElevenLabs API', 'elevenlabs');
      return [];
    }
    
    // Transform API models to match our expected model structure
    const models: ElevenLabsModel[] = apiModels.map(model => ({
      model_id: model.model_id,
      name: model.name || `Model ${model.model_id.substring(0, 6)}`,
      description: model.description,
      can_be_finetuned: model.can_be_finetuned,
      can_do_text_to_speech: model.can_do_text_to_speech,
      can_do_voice_conversion: model.can_do_voice_conversion,
      can_use_style: model.can_use_style,
      can_use_speaker_boost: model.can_use_speaker_boost,
      serves_pro_voices: model.serves_pro_voices,
      token_cost_factor: model.token_cost_factor,
      requires_alpha_access: model.requires_alpha_access,
      max_characters_request_free_user: model.max_characters_request_free_user,
      max_characters_request_subscribed_user: model.max_characters_request_subscribed_user,
      maximum_text_length_per_request: model.maximum_text_length_per_request
    }));
    
    log(`Found ${models.length} ElevenLabs models`, 'elevenlabs');
    return models;
  } catch (error: any) {
    log(`Error getting models: ${error?.message || 'Unknown error'}`, 'elevenlabs');
    return [];
  }
}

// Initialize ElevenLabs on module load
initElevenLabs().catch(err => {
  log(`Failed to initialize ElevenLabs: ${err.message}`, 'elevenlabs');
});