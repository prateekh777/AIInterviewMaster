# WebSocket Architecture Documentation

## Overview
This document provides a comprehensive overview of the WebSocket implementation in our AI Interview Platform. It details how WebSocket connections are established, managed, and used for real-time communication during interview sessions.

## Components

### 1. Server-Side Implementation

#### Core WebSocket Server (`server/socket.ts`)
The main WebSocket server implementation that handles:
- Connection establishment
- Message routing
- Interview session management
- Real-time communication with clients

#### Key Structures

```typescript
interface InterviewSession {
  id: string;
  interviewId: number;
  questions: any[];
  currentStage: number;
  currentQuestion: number;
  isPaused: boolean;
  conversation: any[];
}
```

#### Connection Handling
- WebSocket server is initialized in the main server file
- Connections are established on the `/ws` path
- Each connection is tracked and associated with an interview session

#### Message Types
- START_INTERVIEW: Initiates an interview session
- USER_MESSAGE: Handles user responses during the interview
- PAUSE_INTERVIEW: Pauses the ongoing interview
- RESUME_INTERVIEW: Resumes a paused interview
- END_INTERVIEW: Terminates the interview session

### 2. Client-Side Implementation

#### WebSocket Hook (`client/src/hooks/useWebRTC.ts`)
Manages client-side WebSocket connection and:
- Establishes connection to server
- Sends/receives messages
- Manages local state related to the interview
- Handles connection errors and reconnection logic

#### AI Interview Hook (`client/src/hooks/useAIInterview.ts`)
Uses the WebSocket connection to:
- Start interview sessions
- Send user responses
- Process AI interviewer responses
- Control interview flow (pause, resume, end)

### 3. Integration Points

#### Storage Integration
- Interview session data is persisted using the storage implementation
- Messages are stored for future reference and analysis
- Interview status updates are recorded

#### OpenAI Integration
- AI responses are generated using OpenAI service
- Questions are dynamically created based on skill requirements and conversation context

#### Frontend Components
- `InterviewSession.tsx` handles the main interview UI
- `ConversationWindow.tsx` displays the chat history
- Various control components interact with the WebSocket system

## Data Flow

1. **Session Initialization**:
   - Client requests interview start via WebSocket
   - Server creates new session, generates initial questions
   - Server sends first question to client
   - Audio URL is generated for the question if ElevenLabs is available

2. **Question-Answer Flow**:
   - Client sends user answers via WebSocket 
   - Server adds user message to conversation history with validation
   - Server sends typing indicator to show AI activity
   - Server generates next question with OpenAI based on validated conversation
   - Server processes response, adds robust fallback for errors
   - New question is sent back to client with optional audio

3. **Session Control**:
   - Pause/Resume requests modify session state
   - End interview terminates session and triggers async result generation
   - Results are analyzed by OpenAI to provide comprehensive feedback

4. **Enhanced Error Handling**:
   - OpenAI message format validation prevents API errors
   - Null/undefined content in conversation history is filtered
   - Message content is stringified to ensure API compatibility
   - Fallback questions are provided if API calls fail
   - Connection issues trigger reconnection attempts
   - Session state is preserved where possible during disruptions

## Message Validation
Recent improvements implemented:

```typescript
// Message validation before sending to OpenAI
const validatedMessages = messages.filter(msg => 
  msg && typeof msg.content === 'string' && msg.content.trim() !== ''
);

// Enhanced error handling
try {
  // Generate AI response with validated conversation
  const response = await generateNextQuestion(interview, session.conversation);
  
  // Further processing...
} catch (error) {
  // Graceful error handling with fallback question
  const fallbackQuestion = "Could you tell me more about your experience?";
  // Send fallback to client...
}
```

## Persistence
- Active sessions are stored in-memory on the server
- Completed interviews and messages are persisted to MongoDB
- Conversation history maintains proper structure for OpenAI API
- Session restoration is possible on reconnection

## Testing Approach
- Automated test scripts for real-world WebSocket flow
- Interactive testing mode for manual verification
- Integration tests for full WebSocket flow
- Comprehensive error case handling and resilience testing
- Detailed logging for all WebSocket operations

## Recent Enhancements
- Enhanced OpenAI message validation to prevent null content errors
- Added robust error handling in WebSocket message processing
- Implemented comprehensive logging for debugging
- Added automated test script for easier testing
- Created detailed test logs and fixes documentation