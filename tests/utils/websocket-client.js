/**
 * WebSocket Client for testing
 * Provides methods to interact with the application WebSocket API
 */

import WebSocket from 'ws';

export class WebSocketClient {
  constructor(url = 'ws://localhost:5000/ws') {
    this.url = url;
    this.socket = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.messageQueue = new Map();
  }

  /**
   * Connect to the WebSocket server
   * @returns {Promise<void>} A promise that resolves when connected
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.connected = true;
          resolve();
        };

        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.connected = false;
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!this.connected) {
            reject(new Error('Failed to connect to WebSocket server'));
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message.type);

            // Check if there are any handlers for this message type
            if (this.messageHandlers.has(message.type)) {
              const handlers = this.messageHandlers.get(message.type);
              handlers.forEach(handler => handler(message));
            }

            // Check if someone is waiting for this message type
            if (this.messageQueue.has(message.type)) {
              const { resolve } = this.messageQueue.get(message.type);
              this.messageQueue.delete(message.type);
              resolve(message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Send a message to the WebSocket server
   * @param {object} message - The message to send
   */
  send(message) {
    if (!this.connected || !this.socket) {
      throw new Error('WebSocket is not connected');
    }

    this.socket.send(JSON.stringify(message));
    console.log('Sent message:', message.type);
  }

  /**
   * Register a handler for a specific message type
   * @param {string} messageType - The type of message to handle
   * @param {function} handler - The handler function
   */
  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }

    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Wait for a specific message type
   * @param {string} messageType - The type of message to wait for
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<object>} A promise that resolves with the message
   */
  waitForMessage(messageType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        this.messageQueue.delete(messageType);
        reject(new Error(`Timeout waiting for message type: ${messageType}`));
      }, timeout);

      // Store the resolver and timeout
      this.messageQueue.set(messageType, {
        resolve: (message) => {
          clearTimeout(timeoutId);
          resolve(message);
        },
        timeoutId
      });
    });
  }

  /**
   * Close the WebSocket connection
   * @returns {Promise<void>} A promise that resolves when closed
   */
  async close() {
    return new Promise((resolve) => {
      if (!this.connected || !this.socket) {
        resolve();
        return;
      }

      this.socket.onclose = () => {
        this.connected = false;
        resolve();
      };

      this.socket.close();
    });
  }
}