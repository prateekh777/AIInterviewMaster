/**
 * OpenAI API Integration Tests
 * Verifies the OpenAI API integration works correctly
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5001';
const TEST_TIMEOUT = 30000; // 30 seconds timeout

/**
 * Test job description analysis
 */
async function testJobDescriptionAnalysis() {
  console.log('Testing job description analysis...');
  const testTimeout = setTimeout(() => {
    console.log('⚠️ Job description analysis test timed out after 30 seconds');
    return {
      success: false,
      error: 'Test timed out'
    };
  }, TEST_TIMEOUT);

  try {
    const jobDescription = `
      We are looking for a Senior JavaScript Developer with 5+ years of experience.
      Required skills include: React, Node.js, TypeScript, and MongoDB.
      Experience with AWS and CI/CD pipelines is a plus.
      The candidate will be responsible for developing and maintaining our web applications.
    `;

    console.log('Sending job description for analysis...');
    const response = await fetch(`${API_URL}/api/analyze-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobDescription })
    });

    clearTimeout(testTimeout);

    if (!response.ok) {
      throw new Error(`Failed to analyze job description: ${response.status} ${response.statusText}`);
    }

    const analysisResult = await response.json();
    
    console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));
    
    // Validate the response structure
    if (!analysisResult.skills || !Array.isArray(analysisResult.skills) || analysisResult.skills.length === 0) {
      throw new Error('Invalid analysis result: missing or empty skills array');
    }
    
    console.log('✅ Job description analysis successful');
    console.log(`Extracted ${analysisResult.skills.length} skills`);
    
    return {
      success: true,
      data: analysisResult
    };
  } catch (error) {
    clearTimeout(testTimeout);
    console.error('❌ Job description analysis test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test simple chat completion
 */
async function testChatCompletion() {
  console.log('\nTesting chat completion...');
  const testTimeout = setTimeout(() => {
    console.log('⚠️ Chat completion test timed out after 30 seconds');
    return {
      success: false,
      error: 'Test timed out'
    };
  }, TEST_TIMEOUT);

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant for a tech interview.'
      },
      {
        role: 'user',
        content: 'What is the difference between var, let, and const in JavaScript?'
      }
    ];

    console.log('Sending chat completion request...');
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    });

    clearTimeout(testTimeout);

    if (!response.ok) {
      throw new Error(`Failed to get chat completion: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.completion || typeof result.completion !== 'string' || result.completion.length === 0) {
      throw new Error('Invalid chat completion result: missing or empty completion');
    }
    
    console.log('✅ Chat completion successful');
    console.log('First 100 characters of response:', result.completion.substring(0, 100) + '...');
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    clearTimeout(testTimeout);
    console.error('❌ Chat completion test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run all tests
async function runTests() {
  try {
    let analysisResult = null;
    let chatResult = null;
    
    console.log('=== Running OpenAI API Tests ===\n');
    
    analysisResult = await testJobDescriptionAnalysis();
    chatResult = await testChatCompletion();
    
    console.log('\n=== OpenAI API Test Results ===');
    console.log(`Job Description Analysis: ${analysisResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Chat Completion: ${chatResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    return analysisResult.success && chatResult.success;
  } catch (error) {
    console.error('Test execution error:', error);
    return false;
  }
}

runTests().then(success => {
  console.log('\nOpenAI API Tests Completed.');
  process.exit(success ? 0 : 1);
});