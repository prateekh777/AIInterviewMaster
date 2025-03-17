import { 
  User, InsertUser, 
  Interview, InsertInterview, 
  Message, InsertMessage,
  Result, InsertResult
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Interview operations
  createInterview(interview: InsertInterview): Promise<Interview>;
  getInterview(id: number): Promise<Interview | undefined>;
  getAllInterviews(): Promise<Interview[]>; // New method for admin dashboard
  updateInterviewStatus(id: number, status: string): Promise<void>;
  updateInterviewRecording(id: number, recordingUrl: string): Promise<void>;
  updateInterviewDuration(id: number, duration: number): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByInterviewId(interviewId: number): Promise<Message[]>;
  
  // Result operations
  createResult(result: InsertResult): Promise<Result>;
  getResult(id: number): Promise<Result | undefined>;
  getResultByInterviewId(interviewId: number): Promise<Result | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private interviews: Map<number, Interview>;
  private messages: Map<number, Message>;
  private results: Map<number, Result>;
  
  private userIdCounter: number;
  private interviewIdCounter: number;
  private messageIdCounter: number;
  private resultIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.interviews = new Map();
    this.messages = new Map();
    this.results = new Map();
    
    this.userIdCounter = 1;
    this.interviewIdCounter = 1;
    this.messageIdCounter = 1;
    this.resultIdCounter = 1;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Interview operations
  async createInterview(insertInterview: InsertInterview): Promise<Interview> {
    const id = this.interviewIdCounter++;
    const now = new Date();
    
    const interview: Interview = {
      id,
      userId: insertInterview.userId ?? null,
      jobDescription: insertInterview.jobDescription,
      skills: insertInterview.skills,
      interviewType: insertInterview.interviewType,
      difficulty: insertInterview.difficulty,
      status: "in_progress",
      recordingUrl: null,
      duration: 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.interviews.set(id, interview);
    return interview;
  }
  
  async getInterview(id: number): Promise<Interview | undefined> {
    return this.interviews.get(id);
  }
  
  async getAllInterviews(): Promise<Interview[]> {
    return Array.from(this.interviews.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first
  }
  
  async updateInterviewStatus(id: number, status: string): Promise<void> {
    const interview = this.interviews.get(id);
    if (interview) {
      interview.status = status;
      interview.updatedAt = new Date();
      this.interviews.set(id, interview);
    }
  }
  
  async updateInterviewRecording(id: number, recordingUrl: string): Promise<void> {
    const interview = this.interviews.get(id);
    if (interview) {
      interview.recordingUrl = recordingUrl;
      interview.updatedAt = new Date();
      this.interviews.set(id, interview);
    }
  }
  
  async updateInterviewDuration(id: number, duration: number): Promise<void> {
    const interview = this.interviews.get(id);
    if (interview) {
      interview.duration = duration;
      interview.updatedAt = new Date();
      this.interviews.set(id, interview);
    }
  }
  
  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    
    const message: Message = {
      id,
      interviewId: insertMessage.interviewId,
      sender: insertMessage.sender,
      content: insertMessage.content,
      timestamp: new Date()
    };
    
    this.messages.set(id, message);
    return message;
  }
  
  async getMessagesByInterviewId(interviewId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.interviewId === interviewId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  // Result operations
  async createResult(insertResult: InsertResult): Promise<Result> {
    const id = this.resultIdCounter++;
    
    const result: Result = {
      id,
      interviewId: insertResult.interviewId,
      overallRating: insertResult.overallRating,
      technicalProficiency: insertResult.technicalProficiency,
      skillRatings: insertResult.skillRatings,
      feedback: insertResult.feedback,
      createdAt: new Date()
    };
    
    this.results.set(id, result);
    return result;
  }
  
  async getResult(id: number): Promise<Result | undefined> {
    return this.results.get(id);
  }
  
  async getResultByInterviewId(interviewId: number): Promise<Result | undefined> {
    return Array.from(this.results.values()).find(
      result => result.interviewId === interviewId
    );
  }
}

import { MongoStorage } from "./mongoStorage";
export const storage = new MongoStorage();
