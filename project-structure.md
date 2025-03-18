# AIInterviewMaster Project Structure

Below is a visual representation of the AIInterviewMaster project architecture using Mermaid diagrams.

## Component Architecture

```mermaid
graph TD
    subgraph Frontend
        A[App] --> B[Layout]
        B --> C[Navbar]
        B --> D[Footer]
        B --> E[Main Content]
        
        E --> F[Auth Pages]
        F --> F1[Login]
        F --> F2[Register]
        F --> F3[Reset Password]
        
        E --> G[Dashboard]
        G --> G1[User Stats]
        G --> G2[Recent Interviews]
        G --> G3[Recommended Practice]
        
        E --> H[Interview Simulator]
        H --> H1[Question Display]
        H --> H2[Response Recorder]
        H --> H3[Feedback Panel]
        
        E --> I[Profile]
        I --> I1[User Info]
        I --> I2[Settings]
        I --> I3[History]
        
        E --> J[Question Bank]
        J --> J1[Categories]
        J --> J2[Difficulty Levels]
        J --> J3[Search/Filter]
    end
    
    subgraph Backend
        K[API Routes]
        K --> L[Auth Controller]
        K --> M[User Controller]
        K --> N[Interview Controller]
        K --> O[Question Controller]
        K --> P[Feedback Controller]
        
        L --> DB[(Database)]
        M --> DB
        N --> DB
        O --> DB
        P --> DB
        
        N --> AI[AI Service]
        P --> AI
    end
    
    subgraph External
        AI --> OpenAI[OpenAI API]
    end
    
    H2 --> K
    H3 --> K
    G --> K
    I --> K
    J --> K
    F --> K
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant AI

    User->>Frontend: Login/Register
    Frontend->>Backend: Auth Request
    Backend->>Database: Validate/Store User
    Database-->>Backend: User Data
    Backend-->>Frontend: Auth Response
    Frontend-->>User: Dashboard Access

    User->>Frontend: Start Interview
    Frontend->>Backend: Get Questions
    Backend->>Database: Fetch Questions
    Database-->>Backend: Question Data
    Backend-->>Frontend: Questions
    Frontend-->>User: Display Question

    User->>Frontend: Submit Response
    Frontend->>Backend: Send Response
    Backend->>AI: Process Response
    AI-->>Backend: Feedback/Analysis
    Backend->>Database: Store Interview Data
    Backend-->>Frontend: Feedback
    Frontend-->>User: Display Feedback
```

## Database Schema

```mermaid
erDiagram
    USERS {
        string id PK
        string email
        string password_hash
        string name
        date created_at
        date updated_at
        string profile_picture
        json preferences
    }
    
    INTERVIEWS {
        string id PK
        string user_id FK
        date created_at
        string title
        string category
        string difficulty
        int duration
        string status
        float score
    }
    
    QUESTIONS {
        string id PK
        string category
        string difficulty
        string text
        json metadata
        string created_by
    }
    
    RESPONSES {
        string id PK
        string interview_id FK
        string question_id FK
        string text
        json feedback
        float score
        date created_at
    }
    
    CATEGORIES {
        string id PK
        string name
        string description
        int question_count
    }
    
    USERS ||--o{ INTERVIEWS : "conducts"
    INTERVIEWS ||--o{ RESPONSES : "contains"
    QUESTIONS ||--o{ RESPONSES : "answered in"
    CATEGORIES ||--o{ QUESTIONS : "groups"
```

## Deployment Architecture

```mermaid
flowchart TD
    subgraph Client
        A[Web Browser]
        B[Mobile App]
    end
    
    subgraph Cloud
        C[CDN]
        D[Load Balancer]
        
        subgraph Application
            E[Frontend Server]
            F[API Server]
            G[Authentication Service]
            H[AI Processing Service]
        end
        
        I[(Database)]
        J[Cache]
        K[Storage]
        
        L[Monitoring]
        M[Logging]
    end
    
    subgraph External Services
        N[OpenAI API]
        O[Email Service]
        P[Payment Gateway]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    H --> N
    F --> O
    F --> P
    
    Application --> L
    Application --> M
``` 

## Video Player Component

A. VideoPlayer.tsx
   - Purpose: Playback of recorded videos
   - Features:
     - Takes video URL as input
     - Handles loading states
     - Shows errors
     - Basic video controls

## Video Grid Component

B. VideoGrid.tsx
   - Purpose: Live video streaming interface
   - Features:
     - Shows AI interviewer and candidate videos
     - Camera controls (on/off) ----------------------->
     - Microphone controls
     - Background settings
     - Status indicators ------------------------------>

## useWebRTC Hook

C. useWebRTC Hook
   - Purpose: Core video stream management
   - Features:
     - Stream initialization
     - Track management
     - Camera/mic toggling
     - Recording functionality
     - Stream health monitoring

```
## Video Implementation Flow

mermaid
graph TB
    subgraph InterviewSession
        IS[Interview Session Page] --> VG[VideoGrid Component]
        IS --> VP[VideoPlayer Component]
    end

    subgraph VideoGrid_Flow
        VG --> useWebRTC
        useWebRTC --> |Initialize| SM[Stream Management]
        SM --> |Monitor| SH[Stream Health]
        SM --> |Control| TC[Track Controls]
        
        TC --> |Toggle| CAM[Camera]
        TC --> |Toggle| MIC[Microphone]
        
        CAM --> |On| CO[Camera On Flow]
        CAM --> |Off| CF[Camera Off Flow]
        
        CO --> |1| REQ[Request Permission]
        CO --> |2| INIT[Initialize Stream]
        CO --> |3| ATTACH[Attach to Video Element]
        
        CF --> |1| STOP[Stop Tracks]
        CF --> |2| CLEAR[Clear Video Element]
        CF --> |3| CLEANUP[Clean References]
    end

    subgraph Recording_Flow
        REC[Recording Controls] --> |Start| SR[Start Recording]
        REC --> |Stop| STR[Stop Recording]
        
        SR --> |1| CLONE[Clone Stream]
        SR --> |2| CREATE[Create MediaRecorder]
        SR --> |3| CHUNKS[Collect Data Chunks]
        
        STR --> |1| STOP_REC[Stop MediaRecorder]
        STR --> |2| BLOB[Create Blob]
        STR --> |3| UPLOAD[Upload Recording]
    end

    subgraph VideoPlayer_Flow
        VP --> |1| LOAD[Load Video]
        VP --> |2| META[Load Metadata]
        VP --> |3| PLAY[Enable Playback]
        
        LOAD --> |Error| ERR[Show Error]
        LOAD --> |Success| SUCCESS[Show Controls]
    end
```

## Video Implementation Flow Details

1. **Initial Setup**
```typescript
// InterviewSession mounts
↓
// VideoGrid initializes
↓
// useWebRTC hook sets up:
- Stream states
- Track references
- Event listeners
- Health monitoring
```

2. **Camera Initialization Flow**
```typescript
User clicks "Initialize Camera"
↓
startLocalStream()
↓
navigator.mediaDevices.getUserMedia()
↓
Set up track event listeners
↓
Attach stream to video element
```

3. **Camera Toggle Flow**
```typescript
User clicks camera toggle
↓
toggleCamera()
↓
If turning OFF:
  - Stop all video tracks
  - Remove tracks from stream
  - Clear video element
  - Clean up references
  - Stop health monitoring
↓
If turning ON:
  - Request new video stream
  - Add track to existing stream
  - Attach to video element
  - Resume health monitoring
```

4. **Recording Flow**
```typescript
Start Recording
↓
Clone stream for protection
↓
Create MediaRecorder
↓
Collect data chunks
↓
Stop Recording
↓
Create Blob
↓
Upload to server
```

5. **Video Playback Flow**
```typescript
VideoPlayer receives URL
↓
Load video metadata
↓
Show loading state
↓
Enable controls when ready
↓
Handle errors if they occur
```

6. **Health Monitoring Flow**
```typescript
Every 3 seconds:
↓
Check if camera is meant to be on
↓
Verify track states
↓
If issues detected AND camera should be on:
  - Attempt recovery
  - Reconnect stream
  - Restart tracks if needed
```

This implementation ensures:
- Clear separation of concerns between components
- Proper resource management
- Graceful error handling
- Smooth user experience
- Proper cleanup of device resources

The key to fixing the camera persistence issue is ensuring that the health monitoring system respects the camera's intended state and that all track instances are properly stopped when turning the camera off.
