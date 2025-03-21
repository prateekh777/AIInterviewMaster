import { ObjectId } from "mongodb";
import { users, interviews, messages, results, getNextSequence, COLLECTION_NAMES } from "./mongodb";
import type { IStorage } from "./storage";
import type { User, InsertUser, Interview, InsertInterview, Message, InsertMessage, Result, InsertResult } from "@shared/schema";

export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const user = await users.findOne({ id });
    if (!user) return undefined;
    const { _id, ...userData } = user;
    return userData;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await users.findOne({ username });
    if (!user) return undefined;
    const { _id, ...userData } = user;
    return userData;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = await getNextSequence(COLLECTION_NAMES.USERS);
    const newUser = {
      _id: new ObjectId(),
      ...user,
      id
    };
    await users.insertOne(newUser);
    const { _id, ...userData } = newUser;
    return userData;
  }

  // Interview operations
  async createInterview(interview: InsertInterview): Promise<Interview> {
    const id = await getNextSequence(COLLECTION_NAMES.INTERVIEWS);
    const now = new Date();
    const newInterview = {
      _id: new ObjectId(),
      ...interview,
      id,
      status: "in_progress",
      recordingUrl: null,
      duration: 0,
      createdAt: now,
      updatedAt: now,
      userId: interview.userId ?? null
    };
    
    await interviews.insertOne(newInterview);
    const { _id, ...interviewData } = newInterview;
    return interviewData;
  }

  async getInterview(id: number): Promise<Interview | undefined> {
    const interview = await interviews.findOne({ id });
    if (!interview) return undefined;
    const { _id, ...interviewData } = interview;
    return interviewData;
  }
  
  async getAllInterviews(): Promise<Interview[]> {
    console.log('[CHECKPOINT:MONGODB_GET_ALL_INTERVIEWS] Fetching all interviews from MongoDB');
    try {
      const interviewList = await interviews.find().sort({ createdAt: -1 }).toArray();
      console.log(`[CHECKPOINT:MONGODB_GET_ALL_INTERVIEWS_SUCCESS] Found ${interviewList.length} interviews`);
      return interviewList.map(({ _id, ...interviewData }) => interviewData);
    } catch (error) {
      console.error('[CHECKPOINT:MONGODB_GET_ALL_INTERVIEWS_ERROR]', error);
      throw error;
    }
  }

  async updateInterviewStatus(id: number, status: string): Promise<void> {
    await interviews.updateOne(
      { id },
      { $set: { status, updatedAt: new Date() } }
    );
  }

  async updateInterviewRecording(id: number, recordingUrl: string): Promise<void> {
    console.log(`[CHECKPOINT:DB_RECORDING_UPDATE_START] Updating recording URL for interview ${id}`);
    
    try {
      // Verify interview exists first
      const interview = await interviews.findOne({ id });
      if (!interview) {
        console.error(`[CHECKPOINT:DB_RECORDING_UPDATE_ERROR] Interview not found: ${id}`);
        throw new Error(`Interview with ID ${id} not found`);
      }
      
      console.log(`[CHECKPOINT:DB_RECORDING_UPDATE_FOUND] Interview found, proceeding with update`);
      
      // Update the recording URL
      const result = await interviews.updateOne(
        { id },
        { $set: { recordingUrl, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        console.error(`[CHECKPOINT:DB_RECORDING_UPDATE_FAILED] No interview matched for update: ${id}`);
        throw new Error(`Failed to update interview: no document matched ID ${id}`);
      }
      
      if (result.modifiedCount === 0) {
        console.warn(`[CHECKPOINT:DB_RECORDING_NO_CHANGE] Interview ${id} recording URL was not changed (same value)`);
      } else {
        console.log(`[CHECKPOINT:DB_RECORDING_UPDATED] Successfully updated recording URL for interview ${id}`);
      }
    } catch (error: any) {
      console.error(`[CHECKPOINT:DB_RECORDING_UPDATE_ERROR] Failed to update recording URL for interview ${id}`);
      console.error(`[CHECKPOINT:DB_RECORDING_ERROR_DETAILS] ${error.message}`);
      console.error(`[CHECKPOINT:DB_RECORDING_ERROR_STACK] ${error.stack}`);
      throw error;
    }
  }

  async updateInterviewDuration(id: number, duration: number): Promise<void> {
    await interviews.updateOne(
      { id },
      { $set: { duration, updatedAt: new Date() } }
    );
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = await getNextSequence(COLLECTION_NAMES.MESSAGES);
    const now = new Date();
    const newMessage = {
      _id: new ObjectId(),
      ...message,
      id,
      timestamp: now
    };
    
    await messages.insertOne(newMessage);
    const { _id, ...messageData } = newMessage;
    return messageData;
  }

  async getMessagesByInterviewId(interviewId: number): Promise<Message[]> {
    const messagesList = await messages.find({ interviewId }).toArray();
    return messagesList.map(({ _id, ...messageData }) => messageData);
  }

  // Result operations
  async createResult(result: InsertResult): Promise<Result> {
    const id = await getNextSequence(COLLECTION_NAMES.RESULTS);
    const now = new Date();
    const newResult = {
      _id: new ObjectId(),
      ...result,
      id,
      createdAt: now
    };
    
    await results.insertOne(newResult);
    const { _id, ...resultData } = newResult;
    return resultData;
  }

  async getResult(id: number): Promise<Result | undefined> {
    const result = await results.findOne({ id });
    if (!result) return undefined;
    const { _id, ...resultData } = result;
    return resultData;
  }

  async getResultByInterviewId(interviewId: number): Promise<Result | undefined> {
    const result = await results.findOne({ interviewId });
    if (!result) return undefined;
    const { _id, ...resultData } = result;
    return resultData;
  }
}