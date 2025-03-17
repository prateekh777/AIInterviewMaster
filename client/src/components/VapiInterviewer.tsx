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

  useEffect(() => {
    // Vapi configuration
    const assistant = "7c5cebc4-afa2-420b-a43e-2523342d93d3";
    const apiKey = "b928f862-38ab-4473-8617-f8215585965e";
    
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
      recordingEnabled: true,
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

    // Create and inject the script
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    
    script.onload = function () {
      try {
        const vapiInstance = (window as any).vapiSDK.run({
          apiKey: apiKey,
          assistant: assistant,
          config: assistantOptions
        });

        // Add event listeners
        vapiInstance?.on?.('error', (error: any) => {
          console.error('Vapi Error:', error);
        });

        vapiInstance?.on?.('call-start', () => {
          console.log('Call started');
          onStatusChange?.({ connected: true, speaking: false });
        });

        vapiInstance?.on?.('call-end', () => {
          console.log('Call ended');
          onStatusChange?.({ connected: false, speaking: false });
        });

        setVapiInstance(vapiInstance);
      } catch (error) {
        console.error('Error initializing Vapi:', error);
      }
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [onStatusChange]);

  useEffect(() => {
    if (isActive && vapiInstance) {
      vapiInstance.start(assistantOptions);
    } else if (!isActive && vapiInstance) {
      vapiInstance.stop();
    }
  }, [isActive, vapiInstance]);

  // Add transcript handling
  useEffect(() => {
    if (vapiInstance) {
      vapiInstance.on('conversation-update', (update: any) => {
        if (onTranscriptUpdate) {
          onTranscriptUpdate(update.conversation);
        }
      });
    }
  }, [vapiInstance, onTranscriptUpdate]);

  return (
    <div className="vapi-container w-full h-full bg-gradient-to-br from-black via-blue-900 to-slate-800 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        {isActive ? (
          <div className="text-white text-lg">Interview in progress...</div>
        ) : (
          <div className="text-white text-lg">Click Start Interview to begin</div>
        )}
      </div>
      <div id="vapiTyping" className="absolute bottom-4 left-4 text-white text-sm"></div>
      <div id="vapiStatusMessage" className="absolute top-4 right-4 text-white text-sm"></div>
      <div id="chat" className="hidden"></div>
    </div>
  );
} 