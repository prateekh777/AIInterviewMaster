/**
 * File Upload Tests
 * Verifies the recording upload functionality works correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TestRunner } from '../utils/test-runner.js';
import { ApiClient } from '../utils/api-client.js';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  const testRunner = new TestRunner('File Upload Tests');
  const apiClient = new ApiClient();

  await testRunner.run(async (runner) => {
    let interviewId;
    
    // Create a test interview to use for the recording upload
    await runner.test('Should create a test interview', async () => {
      const interviewData = {
        jobDescription: "Testing recording uploads for interviews",
        skills: ["JavaScript", "Node.js"],
        interviewType: "technical",
        difficulty: "intermediate"
      };
      
      const response = await apiClient.post('/api/interviews', interviewData);
      interviewId = response.id;
      
      runner.assert(interviewId, 'Should create an interview and return its ID');
      console.log(`Created test interview with ID: ${interviewId}`);
    });
    
    // Create a test file if needed
    await runner.test('Should prepare a test recording file', async () => {
      // Create a simple text file pretending to be a recording
      // In a real test, this would be an actual WebM or MP4 file
      const testFilePath = path.join(__dirname, '..', 'test-recording.txt');
      
      fs.writeFileSync(testFilePath, 'This is a test recording file content');
      
      runner.assert(fs.existsSync(testFilePath), 'Test file should be created');
      console.log(`Created test file at: ${testFilePath}`);
    });
    
    // Test uploading a recording
    await runner.test('Should upload a recording file', async () => {
      if (!interviewId) {
        throw new Error('No interview ID available for testing');
      }
      
      const testFilePath = path.join(__dirname, '..', 'test-recording.txt');
      
      // Using ApiClient's uploadFile method for file upload
      const fileBuffer = fs.readFileSync(testFilePath);
      const response = await apiClient.uploadFile(
        '/api/upload-recording',
        fileBuffer,
        'file',
        { interviewId: interviewId.toString() }
      );
      
      // Check response
      runner.assert(response, 'Should receive a response');
      runner.assert(response.success, 'Response should indicate success');
      runner.assert(response.recordingUrl, 'Response should contain recordingUrl');
      
      console.log(`Uploaded recording, got URL: ${response.recordingUrl}`);
      
      // Update the interview with the recording URL
      const updateResponse = await apiClient.patch(`/api/interviews/${interviewId}/recording`, {
        recordingUrl: response.recordingUrl
      });
      
      runner.assert(updateResponse.recordingUrl, 'Interview should be updated with the recording URL');
      runner.assertEquals(updateResponse.recordingUrl, response.recordingUrl, 'Updated URL should match upload URL');
    });
    
    // Cleanup after the test
    await runner.test('Should clean up test files', async () => {
      const testFilePath = path.join(__dirname, '..', 'test-recording.txt');
      
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      
      runner.assert(!fs.existsSync(testFilePath), 'Test file should be deleted');
    });
  });
}

runTests().catch(console.error);