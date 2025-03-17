/**
 * API Client for testing
 * Provides methods to interact with the application APIs
 */

export class ApiClient {
  constructor(baseUrl = 'http://localhost:5001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the API
   * @param {string} endpoint - The endpoint to request
   * @returns {Promise<any>} The parsed JSON response
   */
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Text response
        const text = await response.text();
        try {
          // Try to parse as JSON anyway - some servers don't set content-type correctly
          return JSON.parse(text);
        } catch (e) {
          console.warn(`Response is not JSON: ${text.substring(0, 100)}...`);
          return { text, status: response.status };
        }
      }
    } catch (error) {
      console.error(`GET request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to the API
   * @param {string} endpoint - The endpoint to request
   * @param {object} data - The data to send
   * @returns {Promise<any>} The parsed JSON response
   */
  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Text response
        const text = await response.text();
        try {
          // Try to parse as JSON anyway - some servers don't set content-type correctly
          return JSON.parse(text);
        } catch (e) {
          console.warn(`Response is not JSON: ${text.substring(0, 100)}...`);
          return { text, status: response.status };
        }
      }
    } catch (error) {
      console.error(`POST request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a PATCH request to the API
   * @param {string} endpoint - The endpoint to request
   * @param {object} data - The data to send
   * @returns {Promise<any>} The parsed JSON response
   */
  async patch(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Text response
        const text = await response.text();
        try {
          // Try to parse as JSON anyway - some servers don't set content-type correctly
          return JSON.parse(text);
        } catch (e) {
          console.warn(`Response is not JSON: ${text.substring(0, 100)}...`);
          return { text, status: response.status };
        }
      }
    } catch (error) {
      console.error(`PATCH request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request to the API
   * @param {string} endpoint - The endpoint to request
   * @returns {Promise<any>} The parsed JSON response
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Text response
        const text = await response.text();
        try {
          // Try to parse as JSON anyway - some servers don't set content-type correctly
          return JSON.parse(text);
        } catch (e) {
          console.warn(`Response is not JSON: ${text.substring(0, 100)}...`);
          return { text, status: response.status };
        }
      }
    } catch (error) {
      console.error(`DELETE request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Upload a file to the API
   * @param {string} endpoint - The endpoint to request
   * @param {File|Blob|Buffer} file - The file to upload
   * @param {string} fileField - The name of the field for the file
   * @param {object} additionalFields - Additional form fields to include
   * @returns {Promise<any>} The parsed JSON response
   */
  async uploadFile(endpoint, file, fileField = 'file', additionalFields = {}) {
    try {
      // Need to use FormData implementation compatible with Node.js
      const { FormData } = await import('formdata-node');
      const { fileFromPath } = await import('formdata-node/file-from-path');
      
      const formData = new FormData();
      
      // Add the file - if it's a Buffer, we'll need to create a temporary file
      if (Buffer.isBuffer(file)) {
        const fileName = `temp-${Date.now()}.bin`;
        const filePath = `/tmp/${fileName}`;
        const fs = await import('fs');
        fs.writeFileSync(filePath, file);
        formData.set(fileField, await fileFromPath(filePath, fileName));
      } else {
        formData.set(fileField, file);
      }
      
      // Add any additional fields
      for (const [key, value] of Object.entries(additionalFields)) {
        formData.set(key, value);
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`File upload failed with status ${response.status}: ${await response.text()}`);
      }
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // Text response
        const text = await response.text();
        try {
          // Try to parse as JSON anyway - some servers don't set content-type correctly
          return JSON.parse(text);
        } catch (e) {
          console.warn(`Response is not JSON: ${text.substring(0, 100)}...`);
          return { text, status: response.status };
        }
      }
    } catch (error) {
      console.error(`File upload to ${endpoint} failed:`, error);
      throw error;
    }
  }
}