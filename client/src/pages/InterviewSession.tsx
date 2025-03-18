import { useState } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useToast } from "@/hooks/use-toast";
import VideoGrid from "@/components/VideoGrid";
import VapiInterviewer from "@/components/VapiInterviewer";
import InterviewControls from "@/components/InterviewControls";
import TranscriptDisplay from "@/components/TranscriptDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Play, AlertCircle, Loader2 } from "lucide-react"; // Assuming you're using lucide-react
import BackgroundSelector from "@/components/BackgroundSelector";
import { cn } from "@/lib/utils";
import { useInterview } from "@/context/InterviewContext";

export default function InterviewSession() {
  const { interviewType, difficulty } = useInterview();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundType, setBackgroundType] = useState<string>('none');
  const [backgroundValue, setBackgroundValue] = useState<string | undefined>();
  
  const { 
    localVideoRef, 
    localStream, 
    isInitialized,
    isMicMuted, 
    isCameraOff, 
    streamError,
    recordingState,
    isInitializing,
    videoTrackActive,
    initializeStream,
    toggleMicrophone, 
    toggleCamera,
    stopAllMediaTracks
  } = useWebRTC();

  const initializeCamera = async () => {
    try {
      await initializeStream();
      toast({
        title: "Camera Ready",
        description: "Your camera has been initialized. You can now start the interview.",
      });
    } catch (error) {
      console.error("Failed to initialize camera:", error);
      toast({
        title: "Error",
        description: "Failed to access camera. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const handleBackgroundChange = (type: string, value?: string) => {
    setBackgroundType(type);
    setBackgroundValue(value);
    // You'll need to implement the actual background effect in your video processing
  };

  const handleStartInterview = async () => {
    if (!isInitialized) {
      toast({
        title: "Camera Required",
        description: "Please initialize your camera before starting the interview.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Pass interview configuration
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsActive(true);
      toast({
        title: `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview Started`,
        description: `Starting ${difficulty} level interview session.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start the interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndInterview = () => {
    stopAllMediaTracks();
    setIsActive(false);
    
    toast({
      title: "Interview Ended",
      description: "Your interview session has been completed.",
    });
  };

  const handleTranscriptUpdate = (messages: any[]) => {
    console.log('InterviewSession received transcript update:', messages);
    setTranscript(messages);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Instructions Card */}
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">How to Start Your Interview</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">1</div>
                    <p>Click the "Initialize Camera" button to set up your camera and microphone</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">2</div>
                    <p>Verify that you can see yourself in the video preview</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">3</div>
                    <p>Click "Start Interview" to begin your AI-powered interview session</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-lg font-medium">Initializing AI Interview...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          </div>
        )}

        {/* Camera Initialize Button */}
        {!isInitialized && (
          <div className="mb-6">
            <Button 
              onClick={initializeCamera}
              className="bg-blue-500 hover:bg-blue-600"
              disabled={isInitializing}
            >
              <Camera className={cn("mr-2 h-4 w-4", isInitializing && "animate-spin")} />
              {isInitializing ? "Initializing Camera..." : "Initialize Camera"}
            </Button>
          </div>
        )}

        <InterviewControls 
          onStartInterview={handleStartInterview}
          onEndInterview={handleEndInterview}
          isActive={isActive}
          disabled={!isInitialized || isLoading}
          isLoading={isLoading}
          interviewType={interviewType}
          difficulty={difficulty}
        />
        
        {/* Video Component */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-medium mb-2">Your Camera</h2>
            {!isInitialized ? (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p>Initialize your camera to see video preview</p>
                </div>
              </div>
            ) : (
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
                startLocalStream={initializeStream}
                onBackgroundChange={handleBackgroundChange}
                interviewActive={isActive}
              />
            )}
          </div>
        </div>

        {/* Hidden VapiInterviewer */}
        <div className="hidden">
          <VapiInterviewer 
            isActive={isActive}
            onStart={handleStartInterview}
            onEnd={handleEndInterview}
            onTranscriptUpdate={handleTranscriptUpdate}
          />
        </div>

        {/* Transcript Display */}
        <div className="mt-6 w-full">
          <TranscriptDisplay messages={transcript} />
        </div>
      </div>
    </div>
  );
}
