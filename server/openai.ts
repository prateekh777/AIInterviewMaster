import OpenAI from "openai";
import { Interview } from "@shared/schema";
import type { ChatCompletionMessageParam } from "openai/resources";

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Log API status
console.log("OpenAI API client initialized with API key:", process.env.OPENAI_API_KEY ? "Valid API key present" : "API key missing");

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

/**
 * Safely parse JSON with a fallback
 */
function safeParseJSON(jsonString: string | null): any {
  if (!jsonString) return {};
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return {};
  }
}

/**
 * Analyze job description to extract skills and other information
 */
export async function analyzeJobDescription(jobDescription: string) {
  try {
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `You are an expert at analyzing job descriptions and extracting relevant technical skills and requirements. 
      Parse the job description to identify:
      1. Technical skills required (programming languages, frameworks, tools)
      2. Role level/seniority
      3. Domain knowledge required
      
      Respond with JSON in this format:
      {
        "skills": ["skill1", "skill2", ...],
        "role": "role title",
        "seniority": "junior|mid-level|senior|lead"
      }
      
      Keep the skill list concise (max 8 items) and focus on the most important technical skills.`
    };
    
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: jobDescription
    };

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [systemMessage, userMessage],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    return safeParseJSON(content);
  } catch (error) {
    console.error("Error analyzing job description:", error);
    throw new Error(`OpenAI API error: ${error}`);
  }
}

/**
 * Generate interview questions based on job description and skills
 */
export async function generateInterviewQuestions(interview: Interview) {
  try {
    const { jobDescription, skills, interviewType, difficulty } = interview;
    
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `You are an expert technical interviewer. Generate a structured set of interview questions based on the job description and skills provided. 
      The interview is a ${difficulty} ${interviewType} interview.
      
      Generate questions in these categories:
      1. Introduction questions to assess basic understanding
      2. Technical deep-dive questions to assess expertise
      3. Problem-solving scenarios related to the role
      4. Follow-up questions to dig deeper based on typical responses
      
      Respond with JSON in this format:
      {
        "introduction": ["question1", "question2"],
        "technical": ["question1", "question2"],
        "problemSolving": ["question1", "question2"],
        "followUps": {
          "question1": ["followup1", "followup2"],
          "question2": ["followup1", "followup2"]
        }
      }`
    };
    
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: `Job Description: ${jobDescription}\n\nRequired Skills: ${skills.join(", ")}`
    };

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [systemMessage, userMessage],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    return safeParseJSON(content);
  } catch (error) {
    console.error("Error generating interview questions:", error);
    throw new Error(`OpenAI API error: ${error}`);
  }
}

/**
 * Generate next interview question based on conversation history
 */
export async function generateNextQuestion(interview: Interview, conversation: any[]) {
  try {
    const { jobDescription, skills, interviewType, difficulty } = interview;
    
    const systemPrompt = `You are an expert technical interviewer conducting a ${difficulty} level ${interviewType} interview for a position that requires these skills: ${skills.join(", ")}.

    Based on the conversation history, generate the next most appropriate question to ask the candidate. The question should:
    1. Be relevant to the skills required in the job description
    2. Follow naturally from the previous conversation
    3. Dig deeper into areas where the candidate has shown strength or weakness
    4. Be clear and specific
    5. Feel natural and conversational, not like reading from a script
    
    If the candidate's previous answer was vague or incorrect, ask a follow-up that probes deeper or clarifies.
    If the candidate's previous answer was strong, increase the difficulty slightly.
    
    IMPORTANT: Only respond with the next question, nothing else.`;
    
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Job Description: ${jobDescription || "Technical position"}` }
    ];
    
    // Add conversation history with validation to prevent null content
    if (conversation && Array.isArray(conversation)) {
      conversation.forEach(message => {
        // Skip entries with null or undefined content
        if (!message || message.content === null || message.content === undefined) {
          console.warn("Skipping message with null/undefined content in conversation");
          return;
        }
        
        const role = message.role || (message.sender === 'ai' ? 'assistant' : 'user');
        const content = message.content || message.text || "";
        
        // Only add message if content is non-empty after processing
        if (content !== null && content !== undefined) {
          messages.push({
            role: role as 'assistant' | 'user',
            content: String(content) // Ensure content is a string
          });
        }
      });
    } else {
      console.warn("Invalid conversation structure provided to generateNextQuestion");
    }
    
    // Validate messages before sending to OpenAI
    const validatedMessages = messages.filter(msg => 
      msg && typeof msg.content === 'string' && msg.content.trim() !== ''
    );
    
    // Log message count for debugging
    console.log(`Sending ${validatedMessages.length} messages to OpenAI`);
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: validatedMessages
    });

    return response.choices[0].message.content || "Could you tell me more about your experience?";
  } catch (error) {
    console.error("Error generating next question:", error);
    throw new Error(`OpenAI API error: ${error}`);
  }
}

/**
 * Generate interview results and feedback
 */
export async function generateInterviewResults(interview: Interview, messages: any[]) {
  try {
    const { jobDescription, skills, interviewType, difficulty } = interview;
    
    const conversationText = messages.map(msg => 
      `${msg.sender === 'ai' ? 'Interviewer' : 'Candidate'}: ${msg.text}`
    ).join("\n\n");
    
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `You are an expert at evaluating technical interviews. Analyze this interview transcript for a ${difficulty} level position that requires these skills: ${skills.join(", ")}.
      
      Provide a comprehensive evaluation with:
      1. Overall rating (1-10)
      2. Technical proficiency assessment (Poor, Basic, Moderate, Strong, Excellent)
      3. Rating for each required skill (1-10)
      4. Specific strengths demonstrated
      5. Areas that need improvement
      6. Recommended learning paths
      
      Respond with JSON in this format:
      {
        "overallRating": 7,
        "technicalProficiency": "Strong",
        "skillRatings": [
          {"name": "skill1", "score": 8},
          {"name": "skill2", "score": 6}
        ],
        "feedback": {
          "strengths": ["strength1", "strength2", "strength3"],
          "improvements": ["improvement1", "improvement2", "improvement3"],
          "learningPaths": ["path1", "path2", "path3"]
        }
      }`
    };
    
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: `Job Description: ${jobDescription}\n\nRequired Skills: ${skills.join(", ")}\n\nInterview Transcript:\n${conversationText}`
    };

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [systemMessage, userMessage],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    return safeParseJSON(content);
  } catch (error) {
    console.error("Error generating interview results:", error);
    throw new Error(`OpenAI API error: ${error}`);
  }
}
