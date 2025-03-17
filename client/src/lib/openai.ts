// Client-side wrapper for OpenAI API calls
import { apiRequest } from "./queryClient";

export interface AnalyzeJobDescriptionResponse {
  skills: string[];
  role: string;
  seniority: string;
}

export async function analyzeJobDescription(jobDescription: string): Promise<AnalyzeJobDescriptionResponse> {
  try {
    const response = await apiRequest('POST', '/api/analyze-job-description', { jobDescription });
    return await response.json();
  } catch (error) {
    console.error('Error analyzing job description:', error);
    throw error;
  }
}

export interface MessageContent {
  role: 'user' | 'assistant';
  content: string;
}

export async function getChatCompletion(messages: MessageContent[]): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/chat', { messages });
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error getting chat completion:', error);
    throw error;
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}
