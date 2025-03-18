import { useEffect, useState } from 'react';

interface VapiInterviewerProps {
  onStatusChange?: (status: { connected: boolean; speaking: boolean }) => void;
  onTranscriptUpdate?: (messages: any[]) => void;
  isActive: boolean;
  onStart: () => void;
  onEnd: () => void;
}

export default function VapiInterviewer({ 
  onStatusChange, 
  onTranscriptUpdate,
  isActive,
  onStart,
  onEnd
}: VapiInterviewerProps) {
  const [vapiInstance, setVapiInstance] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Move assistant options into the component scope
  const assistantOptions = {
    name: "AI Interviewer",
    voice: {
      voiceId: "sarah",
      provider: "11labs",
      stability: 0.5,
      similarityBoost: 0.75,
    },
    model: {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI interviewer conducting a technical interview. Be professional and thorough in your questioning."
        },
      ],
      provider: "openai",
      maxTokens: 250,
      temperature: 0.7,
      emotionRecognitionEnabled: true,
    },
    recordingEnabled: true,  // This is for audio recording, not video
    firstMessage: "Hello, I'll be conducting your technical interview today. Are you ready to begin?",
    endCallFunctionEnabled: false,
    endCallMessage: "Thank you for completing the interview. We'll analyze your responses.",
    transcriber: {
      model: "nova-2",
      keywords: [],
      language: "en",
      provider: "deepgram",
    },
    clientMessages: [
      "transcript",
      "hang",
      "function-call",
      "speech-update",
      "metadata",
      "conversation-update",
    ],
    serverMessages: [
      "end-of-call-report",
      "status-update",
      "hang",
      "function-call",
    ],
  };

  // Add logging for component state changes
  useEffect(() => {
    console.log('VapiInterviewer state changed:', { isActive, vapiInstance: !!vapiInstance });
  }, [isActive, vapiInstance]);

  useEffect(() => {
    // Vapi configuration
    const assistant = "7c5cebc4-afa2-420b-a43e-2523342d93d3";
    const apiKey = "b928f862-38ab-4473-8617-f8215585965e";
    
    console.log('Initializing Vapi SDK...');
    
    const script = document.createElement('script');
    script.src = "/src/lib/vapi-sdk/html-script-tag/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    
    script.onload = function () {
      console.log('Vapi SDK script loaded successfully');
      try {
        const instance = (window as any).vapiSDK.run({
          apiKey: apiKey,
          assistant: assistant,
          createButton: false // Disable the floating button
        });

        // Set up all event listeners in one place
        instance.on('error', (error: any) => {
          console.error('Vapi Error:', error);
        });

        instance.on('call-start', () => {
          console.log('Vapi call started');
          onStatusChange?.({ connected: true, speaking: false });
        });

        instance.on('call-end', () => {
          console.log('Vapi call ended');
          onStatusChange?.({ connected: false, speaking: false });
          // Clear messages when call ends
          setMessages([]);
        });

        instance.on('message', (message: any) => {
          console.log('Received Vapi message:', message);
          
          if (message.type === 'conversation-update') {
            console.log('Processing conversation update:', message.conversation);
            const formattedMessages = message.conversation
              .filter(msg => msg.role !== 'system') // Filter out system messages
              .map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || new Date().toISOString()
              }));
            console.log('Formatted messages:', formattedMessages);
            setMessages(formattedMessages);
            onTranscriptUpdate?.(formattedMessages);
          }
          
          else if (message.type === 'transcript' && message.transcriptType === 'final') {
            console.log('Processing final transcript:', message);
            const newMessage = {
              role: message.role,
              content: message.transcript,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prev => {
              const updated = prev.length > 0 && prev[prev.length - 1].role === message.role
                ? [...prev.slice(0, -1), newMessage]
                : [...prev, newMessage];
              console.log('Updated messages:', updated);
              onTranscriptUpdate?.(updated); // Update transcript when messages change
              return updated;
            });
          }
        });

        setVapiInstance(instance);
        console.log('Vapi instance created successfully');
      } catch (error) {
        console.error('Error initializing Vapi:', error);
      }
    };

    script.onerror = function() {
      console.error('Failed to load Vapi SDK script');
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []); // Remove dependencies since we're setting up once

  // Handle active state changes
  useEffect(() => {
    if (isActive && vapiInstance) {
      console.log('Starting Vapi interview...');
      try {
        vapiInstance.start(assistantOptions);
        console.log('Vapi interview started successfully');
      } catch (error) {
        console.error('Error starting Vapi interview:', error);
      }
    } else if (!isActive && vapiInstance) {
      console.log('Stopping Vapi interview...');
      try {
        vapiInstance.stop();
        console.log('Vapi interview stopped successfully');
      } catch (error) {
        console.error('Error stopping Vapi interview:', error);
      }
    }
  }, [isActive, vapiInstance]);

  return (
    <div className="vapi-container">
      <div id="vapiTyping" className="hidden"></div>
      <div id="vapiStatusMessage" className="hidden"></div>
      <div id="chat" className="hidden"></div>
    </div>
  );
} 