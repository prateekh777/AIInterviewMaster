/**
 * ElevenLabs Text-to-Speech integration
 * This module provides access to ElevenLabs high-quality voice synthesis
 */
import fs from 'fs';
import path from 'path';
import { log } from './vite';
import { ElevenLabsClient } from 'elevenlabs';
import { Model as ElevenLabsModel } from 'elevenlabs/api';

// Define types for Voice and Model
interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

// Create a compatible interface that matches the ElevenLabs Model structure
interface Model {
  model_id: string;
  name: string | undefined;
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
  // Omitted complex nested types like languages and model_rates for simplicity
}

// Initialize the ElevenLabs client
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Cache for voice IDs to avoid repeated API calls
let voiceCache: Voice[] | null = null;

/**
 * Initialize the ElevenLabs service and cache available voices
 */
export async function initElevenlabs() {
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
    log(`ElevenLabs initialization error: ${error.message}`, 'elevenlabs');
    return false;
  }
}

/**
 * Get a voice by name or ID
 */
export async function getVoiceByName(name: string): Promise<Voice | null> {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error getting voice by name: ${errorMessage}`, 'elevenlabs');
    return null;
  }
}

/**
 * Get all available voices
 */
export async function getAllVoices(): Promise<Voice[]> {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error getting all voices: ${errorMessage}`, 'elevenlabs');
    return [];
  }
}

/**
 * Text-to-speech conversion with streaming support
 * Returns a URL to the generated audio
 */
export async function textToSpeech(
  text: string, 
  voiceId: string = 'Antoni', // Default voice
  options: {
    stability?: number, // 0-1, defaults to 0.5
    similarityBoost?: number, // 0-1, defaults to 0.75
    model?: string, // defaults to 'eleven_monolingual_v1'
    saveToFile?: boolean // Whether to save output to a file
  } = {}
): Promise<{ url: string, buffer?: Buffer }> {
  try {
    const {
      stability = 0.5,
      similarityBoost = 0.75,
      model = 'eleven_monolingual_v1',
      saveToFile = false
    } = options;
    
    // Validate voice exists
    let targetVoice = voiceId;
    if (!voiceId.match(/^[0-9a-zA-Z]{20,}$/)) {
      // If not a voice ID, look up by name
      const voice = await getVoiceByName(voiceId);
      if (!voice) {
        throw new Error(`Voice "${voiceId}" not found`);
      }
      targetVoice = voice.voice_id;
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`TTS error: ${errorMessage}`, 'elevenlabs');
    throw error;
  }
}

/**
 * Get all available models
 */
export async function getModels(): Promise<Model[]> {
  try {
    // Get models from API with explicit typing
    const apiModels: ElevenLabsModel[] = await client.models.getAll();
    
    // Transform API models to our interface format
    const models: Model[] = apiModels.map(apiModel => ({
      model_id: apiModel.model_id,
      name: apiModel.name || `Model ${apiModel.model_id.substring(0, 6)}`,
      description: apiModel.description,
      can_be_finetuned: apiModel.can_be_finetuned,
      can_do_text_to_speech: apiModel.can_do_text_to_speech,
      can_do_voice_conversion: apiModel.can_do_voice_conversion,
      can_use_style: apiModel.can_use_style,
      can_use_speaker_boost: apiModel.can_use_speaker_boost,
      serves_pro_voices: apiModel.serves_pro_voices,
      token_cost_factor: apiModel.token_cost_factor,
      requires_alpha_access: apiModel.requires_alpha_access,
      max_characters_request_free_user: apiModel.max_characters_request_free_user,
      max_characters_request_subscribed_user: apiModel.max_characters_request_subscribed_user,
      maximum_text_length_per_request: apiModel.maximum_text_length_per_request
    }));
    
    return models;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error getting models: ${errorMessage}`, 'elevenlabs');
    return [];
  }
}

// Initialize ElevenLabs on module load
initElevenlabs().catch(err => {
  log(`Failed to initialize ElevenLabs: ${err.message}`, 'elevenlabs');
});