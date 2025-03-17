import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiRequest } from "@/lib/queryClient";

export interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: number;
}

export function useAIInterview(setCurrentStep: (step: number) => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  
  // WebSocket connection
  const socketRef = useRef<WebSocket | null>(null);
  const interviewActiveRef = useRef(false);
  const sessionId = useRef<string | null>(null);
  
  // Add a message to the chat
  const addMessage = useCallback((message: Message) => {
    setMessages(prevMessages => [...prevMessages, message]);
  }, []);
  
  // Initialize WebSocket connection
  const setupWebSocket = useCallback(() => {
    if (socketRef.current) {
      // Check if existing socket is open or connecting
      const readyState = socketRef.current.readyState;
      if (readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected and open");
        return socketRef.current; // Already connected
      } else if (readyState === WebSocket.CONNECTING) {
        console.log("WebSocket is already connecting");
        return socketRef.current; // Still connecting
      } else {
        console.log("Existing WebSocket is in state:", readyState);
        // Close the existing socket if it's in a bad state
        try {
          socketRef.current.close();
        } catch (e) {
          console.log("Error closing existing socket:", e);
        }
        socketRef.current = null;
      }
    }
    
    try {
      // Fixed WebSocket URL construction for Replit environment
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host; // Use host instead (includes port if present)
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log("[CHECKPOINT:WS_CONNECT] Establishing WebSocket connection to:", wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Connection successful
      socket.onopen = () => {
        console.log("WebSocket connection established successfully");
      };
      
      // Receiving messages
      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);
          console.log("WebSocket message received:", data.type);
          
          switch (data.type) {
            case "AI_MESSAGE":
            case "ai_message":
              setIsAITyping(false);
              addMessage({
                id: data.id || uuidv4(),
                sender: "ai",
                text: data.text, // Use text field from the server
                timestamp: data.timestamp || Date.now()
              });
              break;
            
            case "TYPING_INDICATOR":
            case "typing_indicator":
              setIsAITyping(data.isTyping);
              break;
            
            case "INTERVIEW_STEP":
            case "interview_step":
              setCurrentStep(data.step);
              break;
            
            case "SESSION_CREATED":
              console.log("Session created with ID:", data.sessionId);
              sessionId.current = data.sessionId;
              break;
            
            case "ERROR":
            case "error":
              console.error("WebSocket error message:", data.message || data.error);
              setInterviewError(data.message || data.error);
              break;
              
            default:
              console.log("Unknown message type:", data.type, data);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
          console.error("Raw message data:", event.data);
        }
      };
      
      // Connection closed
      socket.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        socketRef.current = null;
        
        if (interviewActiveRef.current) {
          // Auto reconnect if interview is still active
          console.log("Interview is still active, attempting to reconnect in 3 seconds...");
          setTimeout(setupWebSocket, 3000);
        }
      };
      
      // Connection error
      socket.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
        setInterviewError("Connection error. Please refresh the page and try again.");
      };
      
      return socket;
    } catch (error) {
      console.error("WebSocket setup error:", error);
      setInterviewError(`Failed to establish connection: ${String(error)}`);
      return null;
    }
  }, [setCurrentStep, addMessage]);
  
  // Send a message to the AI
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    
    const message: Message = {
      id: uuidv4(),
      sender: "user",
      text: text,
      timestamp: Date.now()
    };
    
    addMessage(message);
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && sessionId.current) {
      socketRef.current.send(JSON.stringify({
        type: "USER_MESSAGE",
        sessionId: sessionId.current,
        message: text
      }));
    } else if (!sessionId.current) {
      setInterviewError("Interview session not initialized. Please refresh and try again.");
    } else {
      setInterviewError("Connection to server lost. Please refresh the page.");
    }
  }, [addMessage]);
  
  // Start the interview
  const startInterview = useCallback(async (
    jobDescription: string,
    skills: string[],
    interviewType: string,
    difficulty: string
  ) => {
    interviewActiveRef.current = true;
    
    try {
      console.log("Starting interview setup...");
      
      // Setup WebSocket first
      let socket = socketRef.current;
      
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log("No active WebSocket, setting up a new one");
        socket = setupWebSocket();
        
        if (!socket) {
          throw new Error("Could not establish WebSocket connection");
        }
      } else {
        console.log("Using existing WebSocket connection");
      }
      
      // Wait for socket to be ready with timeout
      if (socket.readyState !== WebSocket.OPEN) {
        console.log(`WebSocket not ready, current state: ${socket.readyState}, waiting...`);
        await new Promise<void>((resolve, reject) => {
          // Set a timeout to prevent hanging indefinitely
          const timeoutId = setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error("Timed out waiting for WebSocket connection"));
          }, 8000); // 8 second timeout
          
          const checkInterval = setInterval(() => {
            if (!socket) {
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
              reject(new Error("WebSocket connection lost"));
              return;
            }
            
            if (socket.readyState === WebSocket.OPEN) {
              console.log("WebSocket connection is now open");
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
              resolve();
            } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
              console.log(`WebSocket connection closed or closing, state: ${socket.readyState}`);
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
              reject(new Error("WebSocket connection closed"));
            }
          }, 100);
          
          // Also listen for the onopen event directly
          socket.addEventListener('open', () => {
            console.log("WebSocket onopen event triggered");
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            resolve();
          }, { once: true });
        });
      }
      
      console.log("WebSocket ready, sending start_interview message");
      
      // Initialize the interview on the server
      socket.send(JSON.stringify({
        type: "START_INTERVIEW",
        interviewId: 0, // We'll create the interview first, then update this
        jobDescription,
        skills,
        interviewType,
        difficulty
      }));
      
      console.log("Interview initialization message sent to server");
      setIsAITyping(true);
    } catch (error: any) {
      console.error("Error starting interview:", error);
      setInterviewError(`Failed to start interview: ${error?.message || 'Unknown error'}`);
    }
  }, [setupWebSocket]);
  
  // Pause the interview
  const pauseInterview = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "PAUSE_INTERVIEW",
        sessionId: sessionId.current
      }));
    }
  }, []);
  
  // Resume the interview
  const resumeInterview = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "RESUME_INTERVIEW",
        sessionId: sessionId.current
      }));
    }
  }, []);
  
  // End the interview
  const endInterview = useCallback(() => {
    interviewActiveRef.current = false;
    
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "END_INTERVIEW",
          sessionId: sessionId.current
        }));
      }
      
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        interviewActiveRef.current = false;
        socketRef.current.close();
      }
    };
  }, []);
  
  return {
    messages,
    isAITyping,
    interviewError,
    sendMessage,
    startInterview,
    pauseInterview,
    resumeInterview,
    endInterview
  };
}
