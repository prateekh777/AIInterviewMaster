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