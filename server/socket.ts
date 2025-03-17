/**
 * WebSocket server implementation for real-time interview communication
 */
import { WebSocketServer, WebSocket } from 'ws';
import { log } from './vite';
import { IStorage } from './storage';
import { Interview, InsertMessage, Message } from '../shared/schema';
import { generateInterviewResults, generateNextQuestion } from './openai';
import { v4 as uuidv4 } from 'uuid';

// Store active interview sessions
const activeSessions = new Map<string, InterviewSession>();

interface InterviewSession {
  id: string;
  interviewId: number;
  questions: any[];
  currentStage: number;
  currentQuestion: number;
  isPaused: boolean;
  conversation: any[];
}

// Message types
const MESSAGE_TYPES = {
  START_INTERVIEW: 'START_INTERVIEW',
  USER_MESSAGE: 'USER_MESSAGE',
  AI_MESSAGE: 'AI_MESSAGE',
  TYPING_INDICATOR: 'TYPING_INDICATOR',
  PAUSE_INTERVIEW: 'PAUSE_INTERVIEW',
  RESUME_INTERVIEW: 'RESUME_INTERVIEW',
  END_INTERVIEW: 'END_INTERVIEW',
  ERROR: 'ERROR'
};

/**
 * Set up WebSocket handlers
 */
export function setupSocketHandlers(wss: WebSocketServer, storage: IStorage) {
  wss.on("connection", (ws: WebSocket) => {
    log("New WebSocket connection established", "websocket");
    
    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message);
        log(`Received WebSocket message of type: ${data.type}`, "websocket");
        
        // Handle both uppercase and lowercase message types
        const messageType = data.type ? data.type.toUpperCase() : '';
        
        switch (messageType) {
          case "START_INTERVIEW":
            // For a start interview, we need to create an interview first if interviewId is 0
            if (!data.interviewId || data.interviewId === 0) {
              // Create a new interview
              try {
                const newInterview = await storage.createInterview({
                  userId: null,
                  jobDescription: data.jobDescription,
                  skills: data.skills,
                  interviewType: data.interviewType,
                  difficulty: data.difficulty
                });
                
                log(`Created new interview with ID: ${newInterview.id}`, "websocket");
                await handleStartInterview(ws, newInterview.id, storage);
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log(`Error creating interview: ${errorMessage}`, "websocket");
                ws.send(JSON.stringify({
                  type: "ERROR",
                  error: "Failed to create interview"
                }));
              }
            } else {
              await handleStartInterview(ws, data.interviewId, storage);
            }
            break;
            
          case "USER_MESSAGE":
            await handleUserMessage(ws, data.sessionId, data.message, storage);
            break;
            
          case "PAUSE_INTERVIEW":
            await handlePauseInterview(ws, data.sessionId);
            break;
            
          case "RESUME_INTERVIEW":
            await handleResumeInterview(ws, data.sessionId);
            break;
            
          case "END_INTERVIEW":
            await handleEndInterview(ws, data.sessionId, storage);
            break;
            
          default:
            log(`Unknown WebSocket message type: ${data.type}`, "websocket");
            ws.send(JSON.stringify({
              type: "ERROR",
              error: "Unknown message type"
            }));
        }
      } catch (error: any) {
        log(`WebSocket error: ${error.message}`, "websocket");
        ws.send(JSON.stringify({
          type: "ERROR",
          error: "Failed to process message"
        }));
      }
    });
    
    ws.on("close", () => {
      log("WebSocket connection closed", "websocket");
    });
    
    ws.on("error", (error: Error) => {
      log(`WebSocket error: ${error.message}`, "websocket");
    });
  });
}

/**
 * Handle start interview message
 */
async function handleStartInterview(
  ws: WebSocket, 
  interviewId: number,
  storage: IStorage
) {
  try {
    // Create a new session
    const sessionId = uuidv4();
    const session: InterviewSession = {
      id: sessionId,
      interviewId,
      questions: [],
      currentStage: 0,
      currentQuestion: 0,
      isPaused: false,
      conversation: []
    };
    
    // Store the session
    activeSessions.set(sessionId, session);
    
    // Send session ID to client
    ws.send(JSON.stringify({
      type: "SESSION_CREATED",
      sessionId
    }));

    // Get the interview data
    const interview = await storage.getInterview(interviewId);
    if (!interview) {
      throw new Error(`Interview with ID ${interviewId} not found`);
    }

    // Generate welcome message
    setTimeout(async () => {
      try {
        sendTypingIndicator(ws, true);
        
        // Generate AI welcome message
        const welcomeMessage = `Hello! Welcome to your ${interview.difficulty} level technical interview. We'll be focusing on ${interview.skills.join(', ')}. I'll be asking you a series of questions. Take your time to think before answering. Are you ready to begin?`;
        
        sendTypingIndicator(ws, false);
        
        const messageId = uuidv4();
        ws.send(JSON.stringify({
          type: "AI_MESSAGE",
          id: messageId,
          text: welcomeMessage,
          timestamp: Date.now()
        }));
        
        await storage.createMessage({
          interviewId,
          sender: "ai",
          content: welcomeMessage
        });
        
        session.conversation.push({ role: "assistant", content: welcomeMessage });
        activeSessions.set(sessionId, session);
        
      } catch (error: any) {
        log(`Error sending welcome message: ${error.message}`, "websocket");
      }
    }, 1000);
    
  } catch (error: any) {
    log(`Error starting interview: ${error.message}`, "websocket");
    ws.send(JSON.stringify({
      type: "ERROR",
      error: "Failed to start interview"
    }));
  }
}

/**
 * Handle user message
 */
async function handleUserMessage(
  ws: WebSocket, 
  sessionId: string, 
  message: string,
  storage: IStorage
) {
  try {
    // Get session
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (session.isPaused) {
      ws.send(JSON.stringify({
        type: "ERROR",
        error: "Interview is paused"
      }));
      return;
    }
    
    // Store user message
    await storage.createMessage({
      interviewId: session.interviewId,
      sender: "user",
      content: message
    });
    
    // Update session conversation
    session.conversation.push({ role: "user", content: message });
    activeSessions.set(sessionId, session);
    
    // Get interview data
    const interview = await storage.getInterview(session.interviewId);
    if (!interview) {
      throw new Error(`Interview with ID ${session.interviewId} not found`);
    }
    
    // Send typing indicator
    sendTypingIndicator(ws, true);
    
    // Log for debugging
    log(`Processing user message for session ${sessionId}`, "websocket");
    log(`Session conversation length: ${session.conversation.length}`, "websocket");
    
    try {
      // Generate AI response using OpenAI
      const response = await generateNextQuestion(interview, session.conversation);
      
      // Stop typing indicator
      sendTypingIndicator(ws, false);
      
      // Send AI response
      const messageId = uuidv4();
      ws.send(JSON.stringify({
        type: "AI_MESSAGE",
        id: messageId,
        text: response,
        timestamp: Date.now()
      }));
      
      // Store AI message
      await storage.createMessage({
        interviewId: session.interviewId,
        sender: "ai",
        content: response
      });
      
      // Update session conversation
      session.conversation.push({ role: "assistant", content: response });
      activeSessions.set(sessionId, session);
      
    } catch (error: any) {
      log(`Error generating AI response: ${error.message}`, "websocket");
      ws.send(JSON.stringify({
        type: "ERROR",
        error: "Failed to generate response"
      }));
    }
  } catch (error: any) {
    log(`Error handling user message: ${error.message}`, "websocket");
    ws.send(JSON.stringify({
      type: "ERROR",
      error: "Failed to process message"
    }));
  }
}

/**
 * Handle pause interview
 */
async function handlePauseInterview(ws: WebSocket, sessionId: string) {
  try {
    // Get session
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Update session
    session.isPaused = true;
    activeSessions.set(sessionId, session);
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: "INTERVIEW_PAUSED"
    }));
    
  } catch (error: any) {
    log(`Error pausing interview: ${error.message}`, "websocket");
    ws.send(JSON.stringify({
      type: "ERROR",
      error: "Failed to pause interview"
    }));
  }
}

/**
 * Handle resume interview
 */
async function handleResumeInterview(ws: WebSocket, sessionId: string) {
  try {
    // Get session
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Update session
    session.isPaused = false;
    activeSessions.set(sessionId, session);
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: "INTERVIEW_RESUMED"
    }));
    
  } catch (error: any) {
    log(`Error resuming interview: ${error.message}`, "websocket");
    ws.send(JSON.stringify({
      type: "ERROR",
      error: "Failed to resume interview"
    }));
  }
}

/**
 * Handle end interview
 */
async function handleEndInterview(ws: WebSocket, sessionId: string, storage: IStorage) {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Get all messages for this interview
    const messages = await storage.getMessagesByInterviewId(session.interviewId);
    
    // Generate results
    const interview = await storage.getInterview(session.interviewId);
    if (!interview) {
      throw new Error(`Interview ${session.interviewId} not found`);
    }
    
    // Generate and store results
    const results = await generateInterviewResults(interview, messages);
    
    // Store results
    await storage.createResult({
      interviewId: session.interviewId,
      overallRating: results.overallRating,
      technicalProficiency: results.technicalProficiency,
      skillRatings: results.skillRatings,
      feedback: results.feedback
    });
    
    // Update interview status
    await storage.updateInterviewStatus(session.interviewId, "completed");
    
    // Clean up session
    activeSessions.delete(sessionId);
    
    // Send completion message
    ws.send(JSON.stringify({
      type: "INTERVIEW_ENDED",
      message: "Interview completed successfully"
    }));
    
  } catch (error: any) {
    log(`Error ending interview: ${error.message}`, "websocket");
    ws.send(JSON.stringify({
      type: "ERROR",
      error: "Failed to end interview"
    }));
  }
}

/**
 * Send typing indicator
 */
function sendTypingIndicator(ws: WebSocket, isTyping: boolean) {
  ws.send(JSON.stringify({
    type: "TYPING_INDICATOR",
    isTyping
  }));
}