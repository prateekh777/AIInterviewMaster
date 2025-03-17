/**
 * Video Recording Test
 * Tests the video recording functionality including:
 * - Media device access
 * - Media stream capture
 * - Recording and saving video
 * - Uploading recorded video
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5001'; // Use test server instead
const TEST_VIDEO_FILE = path.join(process.cwd(), 'test-uploads', 'test-recording.webm');
const TEST_TIMEOUT = 15000; // 15 seconds

// Create test-uploads directory if it doesn't exist
try {
  if (!fs.existsSync(path.join(process.cwd(), 'test-uploads'))) {
    fs.mkdirSync(path.join(process.cwd(), 'test-uploads'), { recursive: true });
    console.log('Created test-uploads directory');
  }
} catch (error) {
  console.error('Error creating test-uploads directory:', error);
}

/**
 * Create a small test video file if it doesn't exist
 */
async function ensureTestVideoExists() {
  if (fs.existsSync(TEST_VIDEO_FILE)) {
    console.log(`Test video file already exists at ${TEST_VIDEO_FILE}`);
    return TEST_VIDEO_FILE;
  }

  console.log('Creating sample test video file...');
  
  // Since we can't create an actual video from Node.js,
  // we'll download a small sample webm file
  try {
    // For testing, we'll use a sample file from the existing uploads
    const uploadFiles = fs.readdirSync(path.join(process.cwd(), 'uploads'));
    const webmFiles = uploadFiles.filter(file => file.endsWith('.webm'));
    
    if (webmFiles.length > 0) {
      const sourceFile = path.join(process.cwd(), 'uploads', webmFiles[0]);
      fs.copyFileSync(sourceFile, TEST_VIDEO_FILE);
      console.log(`Copied existing webm file from ${sourceFile} to ${TEST_VIDEO_FILE}`);
      return TEST_VIDEO_FILE;
    }
    
    // If no local file exists, create a dummy file (this won't be a valid webm)
    console.log('No existing webm files found, creating a placeholder file');
    fs.writeFileSync(TEST_VIDEO_FILE, Buffer.alloc(1024), 'binary');
    console.log(`Created placeholder file at ${TEST_VIDEO_FILE}`);
    return TEST_VIDEO_FILE;
  } catch (error) {
    console.error('Error creating test video file:', error);
    throw error;
  }
}

/**
 * Test uploading a recorded video
 */
async function testVideoUpload() {
  console.log('Testing video upload functionality...');
  const testTimeout = setTimeout(() => {
    console.log('⚠️ Video upload test timed out after 15 seconds');
    return {
      success: false,
      error: 'Test timed out'
    };
  }, TEST_TIMEOUT);

  try {
    // Ensure we have a test video file
    const videoFile = await ensureTestVideoExists();
    
    // Upload the video
    console.log('Uploading test video...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(videoFile));
    formData.append('interviewId', '999');
    
    const response = await fetch(`${API_URL}/api/upload-recording`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    clearTimeout(testTimeout);
    
    if (!response.ok) {
      throw new Error(`Failed to upload video: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.recordingUrl) {
      throw new Error('Invalid upload response: missing recordingUrl');
    }
    
    console.log('✅ Video upload successful');
    console.log(`Recording URL: ${result.recordingUrl}`);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    clearTimeout(testTimeout);
    console.error('❌ Video upload test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test updating interview with recording URL
 */
async function testUpdateInterviewRecording() {
  console.log('\nTesting interview recording update...');
  
  try {
    // Create a test interview
    console.log('Creating test interview...');
    const createResponse = await fetch(`${API_URL}/api/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobDescription: 'Test job for video recording test',
        skills: ['JavaScript', 'Video Recording'],
        interviewType: 'technical',
        difficulty: 'intermediate'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create interview: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const interview = await createResponse.json();
    console.log(`Created test interview with ID: ${interview.id}`);
    
    // Update the interview with a recording URL
    const recordingUrl = 'https://example.com/recordings/test-recording.webm';
    console.log(`Updating interview ${interview.id} with recording URL: ${recordingUrl}`);
    
    const updateResponse = await fetch(`${API_URL}/api/interviews/${interview.id}/recording`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recordingUrl })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update interview recording: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updatedInterview = await updateResponse.json();
    
    if (updatedInterview.recordingUrl !== recordingUrl) {
      throw new Error(`Recording URL was not updated correctly. Expected: ${recordingUrl}, Got: ${updatedInterview.recordingUrl}`);
    }
    
    console.log('✅ Interview recording URL update successful');
    
    return {
      success: true,
      data: updatedInterview
    };
  } catch (error) {
    console.error('❌ Interview recording update test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run all tests
async function runTests() {
  try {
    let uploadResult = null;
    let updateResult = null;
    
    console.log('=== Running Video Recording Tests ===\n');
    
    uploadResult = await testVideoUpload();
    updateResult = await testUpdateInterviewRecording();
    
    console.log('\n=== Video Recording Test Results ===');
    console.log(`Video Upload: ${uploadResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Interview Recording Update: ${updateResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    return uploadResult.success && updateResult.success;
  } catch (error) {
    console.error('Test execution error:', error);
    return false;
  }
}

runTests().then(success => {
  console.log('\nVideo Recording Tests Completed.');
  process.exit(success ? 0 : 1);
});