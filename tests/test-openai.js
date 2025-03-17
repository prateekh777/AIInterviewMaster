/**
 * Simplified OpenAI module for testing
 * This is a JavaScript version of server/openai.ts that avoids TypeScript features
 */

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1';
let available = false;

/**
 * Initialize OpenAI service with timeout handling
 */
async function initOpenAI() {
  if (!API_KEY) {
    console.error('No OpenAI API key found in environment variables');
    return false;
  }
  
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
    
    console.log('Initializing OpenAI API connection...');
    
    // Minimal check - just verify API key works with a simple request
    const response = await fetch(`${API_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (response.ok) {
      available = true;
      console.log('OpenAI API connection successful');
      return true;
    } else {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('OpenAI API connection timed out after 10 seconds');
    } else {
      console.error('Failed to initialize OpenAI service:', error.message);
    }
    return false;
  }
}

/**
 * Safely parse JSON with a fallback
 */
function safeParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', error.message);
    return null;
  }
}

/**
 * Analyze job description to extract skills and other information
 */
async function analyzeJobDescription(jobDescription) {
  if (!API_KEY || !available) {
    console.error('OpenAI service is not available');
    return null;
  }
  
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout
    
    console.log('Analyzing job description...');
    
    const systemPrompt = `
      You are an expert in technical recruiting and job analysis.
      Extract the following information from the job description:
      1. Key technical skills required (programming languages, frameworks, tools)
      2. The role title
      3. The seniority level (junior, mid-level, senior, lead, etc.)
      
      Format your response as a JSON object with the following structure:
      {
        "skills": ["skill1", "skill2", ...],
        "role": "role title",
        "seniority": "seniority level"
      }
      
      Be concise and only include the JSON object in your response.
    `;
    
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: jobDescription }
        ],
        temperature: 0.2,
        max_tokens: 200, // Limit response size for faster results
      }),
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('Job description analysis completed successfully');
    
    // Parse the JSON response from the model
    return safeParseJSON(content) || {
      skills: [],
      role: 'Unknown Role',
      seniority: 'Unknown Seniority'
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Job description analysis timed out after 20 seconds');
    } else {
      console.error('Failed to analyze job description:', error.message);
    }
    
    return {
      skills: [],
      role: 'Unknown Role',
      seniority: 'Unknown Seniority'
    };
  }
}

/**
 * Generate chat completion with timeout handling
 */
async function generateChatCompletion(messages, options = {}) {
  if (!API_KEY || !available) {
    console.error('OpenAI service is not available');
    return null;
  }
  
  const model = options.model || 'gpt-3.5-turbo';
  const temperature = options.temperature || 0.7;
  const maxTokens = options.maxTokens || 150; // Reduced to improve speed
  
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
    
    console.log('Generating chat completion...');
    
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Chat completion generated successfully');
    
    return data.choices?.[0]?.message?.content || 'No response generated';
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Chat completion timed out after 15 seconds');
      return 'Request timed out. Please try again with a simpler query.';
    } else {
      console.error('Failed to generate chat completion:', error.message);
      return null;
    }
  }
}

/**
 * Transcribe audio to text
 */
async function transcribeAudio(audioBuffer, options = {}) {
  if (!API_KEY || !available) {
    console.error('OpenAI service is not available');
    return null;
  }
  
  const model = options.model || 'whisper-1';
  const language = options.language || 'en';
  
  try {
    const formData = new FormData();
    // Create a Blob from the Buffer
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', model);
    formData.append('language', language);
    
    const response = await fetch(`${API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      text: data.text || '',
      duration: data.duration || 0,
    };
  } catch (error) {
    console.error('Failed to transcribe audio:', error.message);
    return null;
  }
}

// Export functions
export {
  initOpenAI,
  analyzeJobDescription,
  generateChatCompletion,
  transcribeAudio,
  available
};