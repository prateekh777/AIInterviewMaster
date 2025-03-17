/**
 * MongoDB Storage Implementation Tests
 * Verifies the MongoDB storage implementation works correctly
 */

import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://prateek:QttKmiNPgtcCzHAO@personalportfolio.8vv5n.mongodb.net/?retryWrites=true&w=majority&appName=PersonalPortfolio';
const DB_NAME = 'interview_app';

// Helper function to create a test interview
async function createTestInterview() {
  try {
    const response = await fetch(`${API_URL}/api/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobDescription: 'Test job description for MongoDB storage test',
        skills: ['JavaScript', 'MongoDB', 'Testing'],
        interviewType: 'technical',
        difficulty: 'intermediate'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create interview: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create test interview:', error.message);
    throw error;
  }
}

// Test MongoDB connection and operations
async function testMongoDBConnection() {
  let client;
  
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Check for collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`Found collections: ${collectionNames.join(', ')}`);
    
    const requiredCollections = ['users', 'interviews', 'messages', 'results', 'counters'];
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
    
    if (missingCollections.length > 0) {
      console.warn(`⚠️ Missing collections: ${missingCollections.join(', ')}`);
    } else {
      console.log('✅ All required collections exist');
    }
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error.message);
    return false;
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Test interview creation and retrieval
async function testInterviewCreation() {
  try {
    console.log('\nTesting interview creation and storage...');
    
    // Create a test interview through the API
    const interview = await createTestInterview();
    console.log(`✅ Created test interview with ID: ${interview.id}`);
    
    // Verify the interview was stored in MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const interviewsCollection = db.collection('interviews');
    
    const storedInterview = await interviewsCollection.findOne({ id: interview.id });
    
    await client.close();
    
    if (!storedInterview) {
      console.error('❌ Interview was not stored in MongoDB');
      return false;
    }
    
    console.log('✅ Successfully verified interview storage in MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Interview creation test failed:', error.message);
    return false;
  }
}

// Test interview retrieval
async function testInterviewRetrieval() {
  try {
    console.log('\nTesting interview retrieval...');
    
    // Create a test interview
    const createdInterview = await createTestInterview();
    
    // Retrieve the interview through the API
    const response = await fetch(`${API_URL}/api/interviews/${createdInterview.id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to retrieve interview: ${response.status} ${response.statusText}`);
    }
    
    const interview = await response.json();
    
    console.log(`✅ Retrieved interview with ID: ${interview.id}`);
    return true;
  } catch (error) {
    console.error('❌ Interview retrieval test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  try {
    let connectionResult = false;
    let creationResult = false;
    let retrievalResult = false;
    
    // First test MongoDB connection
    connectionResult = await testMongoDBConnection();
    
    // Only run the other tests if connection succeeded
    if (connectionResult) {
      creationResult = await testInterviewCreation();
      retrievalResult = await testInterviewRetrieval();
    }
    
    console.log('\n=== MongoDB Storage Test Results ===');
    console.log(`MongoDB Connection: ${connectionResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Interview Creation: ${creationResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Interview Retrieval: ${retrievalResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    return connectionResult && creationResult && retrievalResult;
  } catch (error) {
    console.error('Test execution error:', error);
    return false;
  }
}

runTests().then(success => {
  console.log('\nMongoDB Storage Test Completed.');
  process.exit(success ? 0 : 1);
});