import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Maximize, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { speechService } from "@/lib/speechService";

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

interface ConversationWindowProps {
  messages: Message[];
  isAITyping: boolean;
  onSendMessage: (text: string) => void;
  interviewTime: string;
  isPaused: boolean;
}

export default function ConversationWindow({ 
  messages, 
  isAITyping, 
  onSendMessage,
  interviewTime,
  isPaused
}: ConversationWindowProps) {
  const [messageText, setMessageText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
    
    // Speak new AI messages
    if (messages.length > 0 && isSpeechEnabled) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'ai' && lastMessage.id !== lastSpokenMessageIdRef.current) {
        // Stop voice recognition while AI is speaking to prevent feedback loops
        if (isListening) {
          console.log("Pausing voice recognition while AI speaks");
          stopVoiceInput();
        }
        
        // Speak the AI message with callbacks
        speechService.speak(
          lastMessage.text, 
          false, // don't interrupt
          {
            onStart: () => {
              console.log("AI speech started - listening paused");
              lastSpokenMessageIdRef.current = lastMessage.id;
            },
            onEnd: () => {
              console.log("AI speech ended - resuming listening");
              // Resume voice recognition after AI finishes speaking
              if (!isListening && !isPaused) {
                // Short delay to ensure clean state
                setTimeout(() => {
                  startVoiceInput();
                }, 300);
              }
            },
            onError: (error) => {
              console.error("AI speech error:", error);
              // Resume voice recognition if speech fails
              if (!isListening && !isPaused) {
                startVoiceInput();
              }
            }
          }
        );
      }
    }
  }, [messages, isAITyping, isSpeechEnabled, isListening, isPaused]);
  
  // Auto-start voice recognition on component mount
  useEffect(() => {
    // Wait a moment to ensure everything is loaded
    const initTimeout = setTimeout(() => {
      if (!isPaused && !isListening) {
        console.log("Auto-starting continuous voice recognition");
        startVoiceInput();
      }
    }, 1000);
    
    return () => {
      clearTimeout(initTimeout);
      stopVoiceInput();
    };
  }, [isPaused]);
  
  // Handle speech toggle
  const toggleSpeech = () => {
    if (isSpeechEnabled) {
      speechService.stop();
      setIsSpeechEnabled(false);
    } else {
      setIsSpeechEnabled(true);
      // Speak the last AI message when re-enabled
      const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai');
      if (lastAiMessage) {
        speechService.speak(
          lastAiMessage.text,
          false,
          {
            onStart: () => {
              console.log("Resumed AI speech started");
              lastSpokenMessageIdRef.current = lastAiMessage.id;
              if (isListening) {
                stopVoiceInput();
              }
            },
            onEnd: () => {
              console.log("Resumed AI speech ended");
              if (!isListening && !isPaused) {
                setTimeout(() => startVoiceInput(), 300);
              }
            }
          }
        );
      }
    }
  };
  
  // Handle send message
  const handleSendMessage = () => {
    if (messageText.trim() && !isPaused) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };
  
  // Handle key press in the input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Send message on Enter
    if (e.key === 'Enter' && messageText.trim() && !isPaused) {
      e.preventDefault();
      handleSendMessage();
    } 
    // Toggle speech recognition on Space when input is empty
    // This now has toggle behavior due to the refactored handleVoiceInput function
    else if (e.key === ' ' && !messageText.trim() && !isPaused) {
      e.preventDefault();
      handleVoiceInput();
    } 
    // Cancel speech recognition on Escape
    else if (e.key === 'Escape' && isListening) {
      e.preventDefault();
      stopVoiceInput();
    }
  };
  
  // Voice input handling with proper toggle functionality
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleVoiceInput = () => {
    // Toggle behavior - if already listening, stop it; otherwise start
    if (isListening) {
      stopVoiceInput();
    } else if (!isPaused) {
      startVoiceInput();
    }
  };
  
  const startVoiceInput = () => {
    try {
      // Clear any existing recognition instance
      stopVoiceInput();
      
      // Set state to listening mode
      setIsListening(true);
      
      // Get SpeechRecognition API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.error("Speech recognition not supported in this browser");
        setIsListening(false);
        alert('Speech recognition not supported in this browser.');
        return;
      }
      
      console.log("Initializing speech recognition...");
      const recognition = new SpeechRecognition();
      
      // Configure recognition settings for better performance
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';
      
      // Speech detection handlers for better responsiveness
      recognition.onspeechstart = () => {
        console.log("Speech detected - user started talking");
        // If AI is currently speaking when user starts talking, interrupt the AI
        if (speechService.isSpeaking()) {
          console.log("User started speaking - interrupting AI speech");
          speechService.stop();
        }
      };
      
      recognition.onspeechend = () => {
        console.log("Speech ended - user stopped talking");
      };
      
      // Results handler
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log(`Speech recognition results: ${event.results.length} results`);
        
        try {
          // Process all results and use the last one
          let transcript = '';
          let confidence = 0;
          let hasFinal = false;
          
          for (let i = 0; i < event.results.length; i++) {
            // For each result
            const result = event.results[i];
            
            if (result.isFinal) {
              transcript = result[0].transcript;
              confidence = result[0].confidence;
              hasFinal = true;
              console.log(`Final transcript: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
            } else if (!hasFinal && i === event.results.length - 1) {
              // Use the last interim result if no final result is available
              transcript = result[0].transcript;
              confidence = result[0].confidence;
              console.log(`Interim transcript: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
            }
          }
          
          if (transcript) {
            setMessageText(transcript);
            
            // If user starts speaking and AI is still talking, stop AI speech to avoid overlap
            if (speechService.isSpeaking() && transcript.length > 5) {
              console.log("User is speaking while AI is talking - stopping AI speech");
              speechService.stop();
            }
            
            // If we got a final result, handle auto-sending with a pause for natural interaction
            if (hasFinal && recognitionTimeoutRef.current === null) {
              if (confidence > 0.6) { // Only auto-send if confidence is good
                recognitionTimeoutRef.current = setTimeout(() => {
                  if (messageText.trim() && !isPaused) {
                    console.log("Auto-sending voice message after pause in speech");
                    handleSendMessage();
                  }
                  
                  // Restart voice recognition
                  if (isListening) {
                    console.log("Refreshing speech recognition after sending message");
                    stopVoiceInput();
                    
                    // Small delay before restarting to ensure clean state
                    setTimeout(() => {
                      if (!isListening) {
                        startVoiceInput();
                      }
                    }, 300);
                  }
                  
                  recognitionTimeoutRef.current = null;
                }, 1200); // Wait 1.2 seconds of silence before auto-sending - slightly faster for more responsive feel
              } else {
                // If confidence is low, just refresh the recognition without sending
                recognitionTimeoutRef.current = setTimeout(() => {
                  if (isListening) {
                    console.log("Refreshing speech recognition");
                    stopVoiceInput();
                    setTimeout(() => !isListening && startVoiceInput(), 300);
                  }
                  recognitionTimeoutRef.current = null;
                }, 2000);
              }
            }
          }
        } catch (error) {
          console.error("Error processing speech results:", error);
        }
      };
      
      // End handler
      recognition.onend = () => {
        console.log("Speech recognition ended");
        
        // Only update state if it wasn't explicitly stopped
        if (speechRecognitionRef.current === recognition) {
          speechRecognitionRef.current = null;
          
          // Try to restart if we're still in listening mode
          if (isListening) {
            console.log("Recognition ended unexpectedly, restarting...");
            setTimeout(startVoiceInput, 500);
          } else {
            setIsListening(false);
          }
        }
      };
      
      // Error handler
      recognition.onerror = (event: Event) => {
        console.error(`Speech recognition error:`, event);
        
        // Only update state if this is the current recognition
        if (speechRecognitionRef.current === recognition) {
          speechRecognitionRef.current = null;
          setIsListening(false);
          
          // Update the placeholder
          if (inputRef.current) {
            inputRef.current.placeholder = "Voice recognition error. Try again...";
            
            // Reset the placeholder after a delay
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.placeholder = isPaused ? 
                  "Interview is paused..." : 
                  "Type here or press space to speak...";
              }
            }, 3000);
          }
        }
      };
      
      // Start recognition
      recognition.start();
      console.log("Speech recognition started");
      speechRecognitionRef.current = recognition;
      
      // Add a visual feedback for the user that mic is active
      if (inputRef.current) {
        inputRef.current.placeholder = "Listening... (click mic or press Space to stop)";
      }
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      setIsListening(false);
      
      if (inputRef.current) {
        inputRef.current.placeholder = "Error starting voice input. Try again...";
      }
    }
  };
  
  const stopVoiceInput = () => {
    console.log("Stopping voice input...");
    
    // Clear any pending recognition timeout
    if (recognitionTimeoutRef.current !== null) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    
    // Stop the recognition instance if it exists
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
        console.log("Speech recognition stopped");
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
      
      speechRecognitionRef.current = null;
    }
    
    // Reset input placeholder
    if (inputRef.current) {
      inputRef.current.placeholder = isPaused ? "Interview is paused..." : "Type here or press space to speak...";
    }
    
    setIsListening(false);
  };
  
  return (
    <Card className={cn(
      "bg-white rounded-lg shadow-md overflow-hidden mb-6 transition-all duration-300",
      isExpanded ? "fixed inset-4 z-50" : ""
    )}>
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Interview Conversation</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-primary"
            title={isSpeechEnabled ? "Mute AI voice" : "Unmute AI voice"}
            onClick={toggleSpeech}
          >
            {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <span className="text-xs text-gray-500">{interviewTime}</span>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-500 hover:text-primary" 
            title={isExpanded ? "Collapse" : "Expand"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={conversationRef}
        className={cn(
          "overflow-y-auto p-4",
          isExpanded ? "h-[calc(100%-8rem)]" : "h-80"
        )}
      >
        {messages.map((message) => (
          <div key={message.id} className="mb-4 fade-in">
            {message.sender === 'ai' ? (
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">AI</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg max-w-[85%]">
                  <p className="text-gray-700">{message.text}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-end">
                <div className="bg-blue-50 p-3 rounded-lg max-w-[85%]">
                  <p className="text-gray-700">{message.text}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">You</div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isAITyping && (
          <div className="flex items-start mb-4 fade-in">
            <div className="flex-shrink-0 mr-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">AI</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg inline-flex items-center">
              <div className="flex items-end">
                <span className="bg-gray-400 rounded-full inline-block h-2 w-2 mx-0.5 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="bg-gray-400 rounded-full inline-block h-2 w-2 mx-0.5 animate-bounce" style={{ animationDelay: '200ms' }}></span>
                <span className="bg-gray-400 rounded-full inline-block h-2 w-2 mx-0.5 animate-bounce" style={{ animationDelay: '400ms' }}></span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className={cn(
        "border-t border-gray-200 p-3 bg-gray-50",
        isPaused ? "opacity-50" : ""
      )}>
        <div className="flex items-center">
          <div className="flex-grow relative">
            <Input 
              ref={inputRef}
              type="text" 
              placeholder={isPaused ? "Interview is paused..." : "Type here or press space to speak..."}
              className="w-full pr-14 py-2 px-4 text-sm"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isPaused}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "p-1.5 rounded-full transition",
                  isListening 
                    ? "bg-red-100 text-red-500 animate-pulse" 
                    : "text-gray-500 hover:bg-gray-200"
                )}
                title={isListening ? "Stop listening" : "Start listening"}
                onClick={handleVoiceInput}
                disabled={isPaused}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 transition"
                title="Send message"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isPaused}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 hidden md:block">
          {isListening 
            ? "Listening to your voice... Tap mic icon or press Esc to stop" 
            : "Click mic icon or press Space to start continuous listening"}
        </div>
      </div>
    </Card>
  );
}
