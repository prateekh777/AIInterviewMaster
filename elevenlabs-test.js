const { ElevenLabsClient } = require('elevenlabs');

async function testElevenLabs() {
  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    
    console.log('Client properties:', Object.getOwnPropertyNames(client));
    console.log('Client methods:', Object.getOwnPropertyNames(client.__proto__));
    console.log('Client voices:', client.voices);
    
    if (client.voices) {
      console.log('Voices methods:', Object.getOwnPropertyNames(client.voices.__proto__));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testElevenLabs();
