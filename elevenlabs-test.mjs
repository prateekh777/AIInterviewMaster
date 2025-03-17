import { ElevenLabsClient } from 'elevenlabs';

async function testElevenLabs() {
  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    console.log('Client properties:', Object.getOwnPropertyNames(client));
    console.log('Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
    
    // Inspect voices property
    console.log('Has voices property:', client.hasOwnProperty('voices'));
    console.log('Client voices:', client.voices);
    
    // Log available properties on voices
    if (client.voices) {
      console.log('Voices methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.voices)));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testElevenLabs();
