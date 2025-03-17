declare global {
  interface Window {
    vapiSDK: {
      run: (config: {
        apiKey: string;
        assistant: string;
        config?: Record<string, any>;
      }) => any;
    };
  }
}

export {}; 