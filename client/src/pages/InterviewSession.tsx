import { useState, useEffect } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useToast } from "@/hooks/use-toast";
import VideoGrid from "@/components/VideoGrid";
import VapiInterviewer from "@/components/VapiInterviewer";
import InterviewControls from "@/components/InterviewControls";
import TranscriptDisplay from "@/components/TranscriptDisplay";

export default function InterviewSession() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<any[]>([]);
  
  // Get media handling hooks for recording the candidate
  const { 
    localVideoRef, 
    localStream, 
    isMicMuted, 
    isCameraOff, 
    isInitializing,
    streamError,
    videoTrackActive,
    startLocalStream, 
    toggleMicrophone, 
    toggleCamera, 
    startRecording, 
    stopRecording,
    stopAllMediaTracks,
    recordingState
  } = useWebRTC();

  // Initialize video stream after component mounts
  useEffect(() => {
    let mounted = true;

    const initializeVideo = async () => {
      try {
        console.log("Initializing media stream...");
        const stream = await startLocalStream();
        console.log("Media stream initialized successfully:", stream ? "Stream available" : "No stream");
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Media stream error:", err);
        if (mounted) {
          toast({
            title: "Camera Setup Failed",
            description: "Failed to access camera and microphone. Please check your permissions.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      }
    };

    initializeVideo();

    return () => {
      mounted = false;
      stopAllMediaTracks();
    };
  }, []);

  const handleStartInterview = () => {
    setIsActive(true);
  };

  const handleEndInterview = () => {
    setIsActive(false);
  };

  const handleTranscriptUpdate = (messages: any[]) => {
    setTranscript(messages);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <InterviewControls 
          onStartInterview={handleStartInterview}
          onEndInterview={handleEndInterview}
          isActive={isActive}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {/* Video Component */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-medium mb-2">Your Camera</h2>
              <VideoGrid 
                localVideoRef={localVideoRef}
                localStream={localStream}
                recordingState={recordingState}
                isMicMuted={isMicMuted}
                isCameraOff={isCameraOff}
                isInitializing={isInitializing}
                streamError={streamError}
                videoTrackActive={videoTrackActive}
                toggleMicrophone={toggleMicrophone}
                toggleCamera={toggleCamera}
                startLocalStream={startLocalStream}
              />
            </div>
          </div>

          {/* Vapi AI Interviewer Component */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 h-full">
              <h2 className="text-lg font-medium mb-2">AI Interviewer</h2>
              <VapiInterviewer 
                isActive={isActive}
                onStart={handleStartInterview}
                onEnd={handleEndInterview}
                onTranscriptUpdate={handleTranscriptUpdate}
              />
            </div>
          </div>
        </div>

        {/* Transcript Display */}
        <TranscriptDisplay messages={transcript} />
      </div>
    </div>
  );
}
