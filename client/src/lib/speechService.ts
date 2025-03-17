/**
 * Speech synthesis service
 * Provides high-quality text-to-speech capabilities
 * Supports both browser speech synthesis and ElevenLabs API
 */

interface SpeechConfig {
  voice: string; // Voice name or identifier
  rate: number; // Speech rate (0.1 to 10)
  pitch: number; // Speech pitch (0 to 2)
  volume: number; // Volume (0 to 1)
  useElevenLabs: boolean; // Whether to use ElevenLabs API
}

class SpeechService {
  private synth: SpeechSynthesis;
  private config: SpeechConfig;
  private speaking: boolean = false;
  private queue: string[] = [];
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private audioQueue: HTMLAudioElement[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private elevenLabsAvailable: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.config = {
      voice: 'Samantha', // Default voice
      rate: 1,
      pitch: 1,
      volume: 1,
      useElevenLabs: true
    };

    // Load voices when they're available
    if (this.synth) {
      console.log('Loading speech synthesis voices...');
      this.loadVoices();
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    
    // Check if ElevenLabs API is available
    this.checkElevenLabsAvailability();
  }

  /**
   * Load available voices from the speech synthesis API
   */
  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    this.voicesLoaded = true;
    console.log(`Loaded ${this.voices.length} voices`);
    
    // Try to select a good default voice if available
    const preferredVoices = ['Samantha', 'Google US English', 'Microsoft David'];
    for (const preferredVoice of preferredVoices) {
      const voice = this.voices.find(v => v.name.includes(preferredVoice));
      if (voice) {
        this.config.voice = voice.name;
        console.log(`Selected voice: ${voice.name}`);
        break;
      }
    }
  }

  /**
   * Check if ElevenLabs API is available
   */
  private async checkElevenLabsAvailability(): Promise<void> {
    try {
      const response = await fetch('/api/tts/voices');
      const data = await response.json();
      this.elevenLabsAvailable = data.available === true;
      
      if (this.elevenLabsAvailable) {
        console.log('ElevenLabs API is available');
      } else {
        console.log('ElevenLabs API is not available, falling back to browser speech synthesis');
        this.config.useElevenLabs = false;
      }
    } catch (error) {
      console.error('Error checking ElevenLabs availability:', error);
      this.elevenLabsAvailable = false;
      this.config.useElevenLabs = false;
    }
  }

  /**
   * Get the appropriate voice based on the current configuration
   */
  private getVoice(): SpeechSynthesisVoice | null {
    if (!this.voicesLoaded) {
      return null;
    }

    // Find voice by name
    const voice = this.voices.find(v => v.name === this.config.voice);
    
    // If not found, return the first available voice or null
    return voice || (this.voices.length > 0 ? this.voices[0] : null);
  }

  /**
   * Configure the speech service
   */
  configure(config: Partial<SpeechConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Speak the provided text
   * @param text Text to be spoken
   * @param interrupt Whether to interrupt any ongoing speech
   * @param callback Optional callback for speech events (start, end, etc.)
   */
  async speak(
    text: string, 
    interrupt: boolean = false,
    callback?: { 
      onStart?: () => void, 
      onEnd?: () => void, 
      onError?: (error: any) => void 
    }
  ): Promise<void> {
    console.log(`Speaking: "${text}"`);
    
    if (interrupt) {
      this.stop();
    }
    
    // If already speaking, add to queue
    if (this.speaking && !interrupt) {
      this.queue.push(text);
      return;
    }
    
    // Signal speaking started
    this.speaking = true;
    if (callback?.onStart) {
      callback.onStart();
    }
    
    // Use ElevenLabs if available and configured
    if (this.config.useElevenLabs && this.elevenLabsAvailable) {
      try {
        await this.speakWithElevenLabs(text, callback);
        return;
      } catch (error) {
        console.error('Error with ElevenLabs, falling back to browser speech synthesis:', error);
        if (callback?.onError) {
          callback.onError(error);
        }
      }
    }
    
    // Fall back to browser speech synthesis
    this.speakWithBrowser(text, callback);
  }
  
  /**
   * Use browser's speech synthesis API
   */
  private speakWithBrowser(
    text: string, 
    callback?: { 
      onStart?: () => void, 
      onEnd?: () => void, 
      onError?: (error: any) => void 
    }
  ): void {
    if (!this.synth) {
      console.error('Speech synthesis not supported');
      if (callback?.onError) {
        callback.onError(new Error('Speech synthesis not supported'));
      }
      this.speaking = false;
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoice();
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = this.config.rate;
    utterance.pitch = this.config.pitch;
    utterance.volume = this.config.volume;
    
    utterance.onstart = () => {
      console.log('Speech started');
      this.speaking = true;
      if (callback?.onStart) {
        callback.onStart();
      }
    };
    
    utterance.onend = () => {
      console.log('Speech ended');
      this.speaking = false;
      
      if (callback?.onEnd) {
        callback.onEnd();
      }
      
      // Check if there are more items in the queue
      if (this.queue.length > 0) {
        const nextText = this.queue.shift();
        if (nextText) {
          setTimeout(() => {
            this.speak(nextText);
          }, 250); // Small delay between speeches
        }
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      this.speaking = false;
      
      if (callback?.onError) {
        callback.onError(event);
      }
    };
    
    this.synth.speak(utterance);
  }
  
  /**
   * Use ElevenLabs API for speech synthesis
   */
  private async speakWithElevenLabs(
    text: string,
    callback?: { 
      onStart?: () => void, 
      onEnd?: () => void, 
      onError?: (error: any) => void 
    }
  ): Promise<void> {
    try {
      // Request speech from server
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          // The Rachel voice is '21m00Tcm4TlvDq8ikWAM' in ElevenLabs
          voice: this.config.voice === 'Rachel' ? '21m00Tcm4TlvDq8ikWAM' : this.config.voice,
          stability: 0.5,
          similarityBoost: 0.75
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to generate speech with ElevenLabs: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.audioUrl) {
        throw new Error('No audio URL returned from server');
      }
      
      // Create audio element
      const audio = new Audio();
      audio.src = data.audioUrl;
      audio.volume = this.config.volume;
      
      // Notify speech started
      if (callback?.onStart) {
        callback.onStart();
      }
      
      // Add to audio queue
      this.audioQueue.push(audio);
      
      // Configure audio events
      audio.onended = () => {
        if (callback?.onEnd) {
          callback.onEnd();
        }
      };
      
      audio.onerror = (event) => {
        if (callback?.onError) {
          callback.onError(event);
        }
      };
      
      // If this is the only audio, play it
      if (this.audioQueue.length === 1 && !this.currentAudio) {
        this.playNextAudio(callback);
      }
    } catch (error) {
      this.speaking = false;
      if (callback?.onError) {
        callback.onError(error);
      }
      throw error;
    }
  }
  
  /**
   * Play the next audio in the queue
   * @param callback Optional callback for audio playback events
   */
  private playNextAudio(callback?: { 
    onEnd?: () => void, 
    onError?: (error: any) => void 
  }): void {
    if (this.audioQueue.length === 0) {
      this.currentAudio = null;
      this.speaking = false;
      
      if (callback?.onEnd) {
        callback.onEnd();
      }
      return;
    }
    
    const audio = this.audioQueue.shift();
    if (!audio) {
      this.speaking = false;
      
      if (callback?.onEnd) {
        callback.onEnd();
      }
      return;
    }
    
    this.currentAudio = audio;
    
    audio.onended = () => {
      console.log('Audio playback ended');
      this.currentAudio = null;
      
      // Check if there are more items in the audio queue
      if (this.audioQueue.length > 0) {
        this.playNextAudio(callback);
      } else {
        this.speaking = false;
        
        // Notify end of speech
        if (callback?.onEnd) {
          callback.onEnd();
        }
        
        // Check if there are more items in the text queue
        if (this.queue.length > 0) {
          const nextText = this.queue.shift();
          if (nextText) {
            setTimeout(() => {
              this.speak(nextText, false, callback);
            }, 250); // Small delay between speeches
          }
        }
      }
    };
    
    audio.onerror = (event) => {
      console.error('Audio error:', event);
      this.currentAudio = null;
      
      if (callback?.onError) {
        callback.onError(event);
      }
      
      this.playNextAudio(callback);
    };
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      this.currentAudio = null;
      
      if (callback?.onError) {
        callback.onError(error);
      }
      
      this.playNextAudio(callback);
    });
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    console.log('Speech stopped');
    
    // Stop browser speech synthesis
    if (this.synth) {
      this.synth.cancel();
    }
    
    // Stop audio playback
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    // Clear audio queue
    this.audioQueue = [];
    
    // Clear text queue
    this.queue = [];
    
    this.speaking = false;
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (!this.speaking) return;
    
    if (this.synth) {
      this.synth.pause();
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
    
    if (this.currentAudio) {
      this.currentAudio.play().catch(console.error);
    }
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported(): boolean {
    return this.synth !== undefined || this.elevenLabsAvailable;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.speaking;
  }
  
  /**
   * Check if ElevenLabs is available
   */
  isElevenLabsAvailable(): boolean {
    return this.elevenLabsAvailable;
  }
  
  /**
   * Set whether to use ElevenLabs
   */
  setUseElevenLabs(use: boolean): void {
    this.config.useElevenLabs = use && this.elevenLabsAvailable;
  }

  /**
   * Get available ElevenLabs voices
   * Returns an array of voice objects with id and name
   */
  async getElevenLabsVoices(): Promise<Array<{id: string, name: string, category: string}>> {
    try {
      const response = await fetch('/api/tts/voices');
      
      if (!response.ok) {
        console.error('Failed to fetch ElevenLabs voices:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      return [];
    }
  }

  /**
   * Set the voice by ID
   * @param voiceId The ID of the voice to use
   */
  setVoice(voiceId: string): void {
    this.config.voice = voiceId;
  }
}

export const speechService = new SpeechService();