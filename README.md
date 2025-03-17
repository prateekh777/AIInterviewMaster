# AIInterviewMaster

AIInterviewMaster is an intelligent interview preparation platform that helps users practice and improve their interview skills using AI technology.

## Project Overview

AIInterviewMaster provides a comprehensive solution for interview preparation, offering features such as:

- AI-powered mock interviews
- Personalized feedback on responses
- Interview question database
- Progress tracking
- Customizable interview scenarios
- Real-time video/audio interviews
- Facial expression and confidence analysis
- Dynamic question adaptation

## Technology Stack

- **Frontend**: React.js with Next.js framework
- **Styling**: Tailwind CSS
- **State Management**: React Context API / Redux
- **Backend**: Node.js / Express.js
- **Database**: MongoDB / PostgreSQL
- **Authentication**: JWT / Auth0
- **AI Integration**: OpenAI API
- **Real-time Communication**: WebSocket
- **Media Processing**: WebRTC, MediaRecorder API
- **Speech Processing**: Whisper AI, ElevenLabs/Google WaveNet
- **Video Analysis**: MediaPipe for facial expression analysis

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB or PostgreSQL (depending on configuration)
- WebRTC-compatible browser
- Camera and microphone access

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/AIInterviewMaster.git
   cd AIInterviewMaster
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_database_connection_string
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=your_jwt_secret
   WEBSOCKET_URL=your_websocket_server_url
   STORAGE_BUCKET=your_cloud_storage_bucket
   ```

4. Start the development server
   ```

## Core Features Implementation

### WebSocket Architecture
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

### Message Types
- START_INTERVIEW: Initiates interview session
- USER_MESSAGE: Handles responses
- PAUSE_INTERVIEW: Pauses interview
- RESUME_INTERVIEW: Resumes interview
- END_INTERVIEW: Terminates session

### Interview Flow
1. Job Description Analysis
   - Parse requirements
   - Extract skills and technologies
   - Generate question flow

2. Real-time Interview
   - WebRTC video/audio streaming
   - Real-time transcription
   - Dynamic question generation
   - Confidence analysis

3. Feedback System
   - Speech pattern analysis
   - Facial expression monitoring
   - Response quality assessment
   - Automated feedback generation

## Development Workflow

### Interview Session Initialization
1. Create interview record in database
2. Initialize media stream
3. Establish WebSocket connection
4. Start video recording
5. Begin AI interaction

### Error Handling
- Automatic WebSocket reconnection
- Media stream fallbacks
- Recording recovery
- Graceful degradation of AI features

## API Integration

### OpenAI Integration
```typescript
export async function analyzeJobDescription(jobDescription: string): Promise<AnalyzeJobDescriptionResponse> {
  try {
    const response = await apiRequest('POST', '/api/analyze-job-description', { jobDescription });
    return await response.json();
  } catch (error) {
    console.error('Error analyzing job description:', error);
    throw error;
  }
}
```

### Interview Results
```typescript
interface InterviewResult {
  id: string;
  overallRating: number;
  technicalProficiency: string;
  duration: number;
  recordingUrl: string | null;
  skillRatings: SkillRating[];
  feedback: Feedback;
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Project Structure