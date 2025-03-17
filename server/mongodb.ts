import { MongoClient, ObjectId, ServerApiVersion, MongoServerError } from "mongodb";
import type { User, Interview, Message, Result } from "@shared/schema";
import dotenv from 'dotenv';
dotenv.config();

// Add this console.log to debug
console.log('MongoDB URI:', process.env.MONGODB_URI);

// Define collection names as constants for type safety
export const COLLECTION_NAMES = {
  USERS: "users",
  INTERVIEWS: "interviews",
  MESSAGES: "messages",
  RESULTS: "results",
  COUNTERS: "counters"
} as const;

type CollectionName = typeof COLLECTION_NAMES[keyof typeof COLLECTION_NAMES];

// MongoDB Document Types
interface MongoDoc {
  _id: ObjectId;
  id: number;
}

interface MongoUser extends Omit<User, 'id'>, MongoDoc {}
interface MongoInterview extends Omit<Interview, 'id'>, MongoDoc {}
interface MongoMessage extends Omit<Message, 'id'>, MongoDoc {}
interface MongoResult extends Omit<Result, 'id'>, MongoDoc {}

interface CounterDoc {
  _id: CollectionName;
  seq: number;
}

// Check MongoDB URI is set
if (!process.env.MONGODB_URI) {
  console.error("[CHECKPOINT:MONGODB_ENV_MISSING] Missing required MONGODB_URI environment variable");
}

// Create MongoDB client with checkpoint tracking
let client: MongoClient;
try {
  console.log("[CHECKPOINT:MONGODB_CLIENT_INIT] Initializing MongoDB client");
  client = new MongoClient(process.env.MONGODB_URI!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
} catch (error) {
  console.error("[CHECKPOINT:MONGODB_CLIENT_INIT_FAILED] Failed to initialize MongoDB client:", error);
  throw error;
}

// Database connection with enhanced error handling and checkpoints
export async function connectToMongoDB() {
  console.log("[CHECKPOINT:MONGODB_CONNECT_START] Attempting to connect to MongoDB");
  try {
    await client.connect();
    console.log("[CHECKPOINT:MONGODB_CONNECTED] Successfully connected to MongoDB");
    
    // Check connection by pinging the database
    await client.db("admin").command({ ping: 1 });
    console.log("[CHECKPOINT:MONGODB_PING_SUCCESS] MongoDB connection verified");
    
    // Initialize counters
    await initializeCounters();
    
    // Log success for clarity in logs
    console.log("[CHECKPOINT:MONGODB_SETUP_COMPLETE] MongoDB setup complete and ready for use");
    
    return true;
  } catch (error: any) {
    console.error("[CHECKPOINT:MONGODB_CONNECT_FAILED] Failed to connect to MongoDB");
    
    // Provide specific error diagnostics based on error type
    if (error instanceof MongoServerError) {
      console.error(`[CHECKPOINT:MONGODB_SERVER_ERROR] MongoDB server error: ${error.code}`);
      
      if (error.code === 18) {
        console.error("[CHECKPOINT:MONGODB_AUTH_FAILED] Authentication failed - check credentials");
      } else if (error.code === 13) {
        console.error("[CHECKPOINT:MONGODB_AUTH_ERROR] Permission denied - check user privileges");
      }
    } else if (error.name === 'MongoNetworkError') {
      console.error("[CHECKPOINT:MONGODB_NETWORK_ERROR] Network error - check connectivity and URI");
    } else {
      console.error(`[CHECKPOINT:MONGODB_UNKNOWN_ERROR] ${error.message}`);
    }
    
    console.error("[CHECKPOINT:MONGODB_ERROR_STACK]", error.stack);
    throw error;
  }
}

// Create database instance
const db = client.db("interview_app");
console.log("[CHECKPOINT:MONGODB_DB_SELECTED] Using database: interview_app");

// Collections with checkpoint logging
export const users = db.collection<MongoUser>(COLLECTION_NAMES.USERS);
export const interviews = db.collection<MongoInterview>(COLLECTION_NAMES.INTERVIEWS);
export const messages = db.collection<MongoMessage>(COLLECTION_NAMES.MESSAGES);
export const results = db.collection<MongoResult>(COLLECTION_NAMES.RESULTS);
export const counters = db.collection<CounterDoc>(COLLECTION_NAMES.COUNTERS);
console.log("[CHECKPOINT:MONGODB_COLLECTIONS_INITIALIZED] MongoDB collections initialized");

/**
 * Initialize counters if they don't exist
 * Enhanced with checkpoint tracking
 */
export async function initializeCounters() {
  console.log("[CHECKPOINT:COUNTERS_INIT_START] Initializing MongoDB counters");
  
  const counterDocs: CounterDoc[] = [
    { _id: COLLECTION_NAMES.USERS, seq: 0 },
    { _id: COLLECTION_NAMES.INTERVIEWS, seq: 0 },
    { _id: COLLECTION_NAMES.MESSAGES, seq: 0 },
    { _id: COLLECTION_NAMES.RESULTS, seq: 0 }
  ];

  try {
    const results = await Promise.all(
      counterDocs.map(doc => 
        counters.updateOne(
          { _id: doc._id },
          { $setOnInsert: doc },
          { upsert: true }
        )
      )
    );
    
    // Log the results for each counter
    results.forEach((result, index) => {
      const counterName = counterDocs[index]._id;
      if (result.upsertedCount === 1) {
        console.log(`[CHECKPOINT:COUNTER_CREATED] Created counter: ${counterName}`);
      } else if (result.matchedCount === 1) {
        console.log(`[CHECKPOINT:COUNTER_EXISTS] Counter already exists: ${counterName}`);
      }
    });
    
    console.log("[CHECKPOINT:COUNTERS_INIT_COMPLETE] Counter initialization complete");
  } catch (error: any) {
    console.error("[CHECKPOINT:COUNTERS_INIT_FAILED] Failed to initialize counters");
    console.error(`[CHECKPOINT:COUNTERS_INIT_ERROR] ${error.message}`);
    
    if (error instanceof MongoServerError) {
      console.error(`[CHECKPOINT:MONGODB_COUNTERS_ERROR] MongoDB server error: ${error.code}`);
    }
    
    throw error;
  }
}

/**
 * Get next sequence value with enhanced checkpoints
 */
export async function getNextSequence(name: CollectionName): Promise<number> {
  console.log(`[CHECKPOINT:SEQUENCE_REQUEST] Requesting next sequence for: ${name}`);
  
  try {
    const result = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after" }
    );

    if (!result) {
      console.error(`[CHECKPOINT:SEQUENCE_NOT_FOUND] Counter not found: ${name}`);
      throw new Error(`Counter ${name} not found`);
    }

    console.log(`[CHECKPOINT:SEQUENCE_SUCCESS] Generated sequence for ${name}: ${result.seq}`);
    return result.seq;
  } catch (error: any) {
    console.error(`[CHECKPOINT:SEQUENCE_FAILED] Failed to get next sequence for ${name}`);
    console.error(`[CHECKPOINT:SEQUENCE_ERROR] ${error.message}`);
    
    // Check for specific MongoDB errors
    if (error instanceof MongoServerError) {
      console.error(`[CHECKPOINT:MONGODB_SEQUENCE_ERROR] MongoDB server error: ${error.code}`);
    }
    
    throw error;
  }
}