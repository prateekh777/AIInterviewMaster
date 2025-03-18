import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Camera, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BackgroundSelector from "./BackgroundSelector";
import { cn } from "@/lib/utils";

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localStream: MediaStream | null;
  recordingState: string;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isInitializing?: boolean;
  streamError?: string | null;
  videoTrackActive?: boolean;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  startLocalStream?: () => Promise<void>;
  onBackgroundChange?: (type: string, value?: string) => void;
  interviewActive?: boolean;
}

export default function VideoGrid({ 
  localVideoRef, 
  localStream, 
  recordingState,
  isMicMuted,
  isCameraOff,
  isInitializing = false,
  streamError = null,
  videoTrackActive = true,
  toggleMicrophone,
  toggleCamera,
  startLocalStream,
  onBackgroundChange,
  interviewActive = false
}: VideoGridProps) {
  const [retrying, setRetrying] = useState<boolean>(false);
  
  // Handle retry for camera
  const handleRetryCamera = async () => {
    if (!startLocalStream) return;
    
    setRetrying(true);
    try {
      await startLocalStream();
    } catch (error) {
      console.error("Error retrying camera:", error);
    } finally {
      setRetrying(false);
    }
  };
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string>('https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80');
  
  // Update the useEffect for handling video stream
  useEffect(() => {
    console.log("VideoGrid effect triggered:", {
      hasVideoRef: !!localVideoRef.current,
      hasStream: !!localStream,
      isCameraOff,
      trackCount: localStream?.getTracks().length
    });
    
    if (!localVideoRef.current) return;
    
    if (localStream && !isCameraOff) {
      console.log("Setting video stream to video element");
      
      // Always set the new stream
      localVideoRef.current.srcObject = localStream;
      console.log("Updated video element with new stream");
      
      const playVideo = async () => {
        try {
          await localVideoRef.current?.play();
          console.log("Video playback started successfully");
        } catch (error) {
          console.error("Error starting video playback:", error);
        }
      };

      // Handle video events
      const handleLoadedMetadata = () => {
        console.log("Video metadata loaded successfully");
        playVideo();
      };
      
      const handleTrackEnded = () => {
        console.log("Track ended, checking stream status");
        if (localStream.getVideoTracks().length === 0) {
          console.log("No video tracks available");
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        }
      };

      // Add event listeners
      localVideoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      localStream.getTracks().forEach(track => {
        track.addEventListener('ended', handleTrackEnded);
      });

      // Cleanup function
      return () => {
        if (localVideoRef.current) {
          localVideoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
        localStream.getTracks().forEach(track => {
          track.removeEventListener('ended', handleTrackEnded);
        });
      };
    } else {
      // Clear video element when camera is off
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream, isCameraOff]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* AI interviewer video */}
      <div className="relative">
        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
          <img 
            src={aiAvatarUrl} 
            alt="AI interviewer avatar" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 flex items-center bg-gray-900 bg-opacity-75 px-2 py-0.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            <span className="text-white text-xs">AI Interviewer</span>
          </div>
        </div>
      </div>
      
      {/* Candidate video */}
      <div className="relative">
        <Card className="aspect-video bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative p-0 border-0">
          {/* Loading State */}
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-white text-sm">Connecting to camera...</p>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {streamError && !isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
              <div className="text-center p-4">
                <div className="h-12 w-12 text-red-500 mx-auto mb-2">⚠️</div>
                <p className="text-white text-sm mb-3">{streamError}</p>
                {startLocalStream && (
                  <Button 
                    className="mt-2 bg-primary hover:bg-blue-600"
                    size="sm"
                    onClick={handleRetryCamera}
                    disabled={retrying}
                  >
                    {retrying ? "Retrying..." : "Retry Camera Connection"}
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* Main Video Display - Simplified logic */}
          {localStream ? (
            <div className="relative w-full h-full">
              {!isCameraOff ? (
                <video 
                  ref={localVideoRef} 
                  className="w-full h-full object-cover"
                  autoPlay 
                  playsInline 
                  muted
                  loop={false}
                  controls={false}
                  disablePictureInPicture={true}
                  disableRemotePlayback={true}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-white text-sm">Camera is turned off</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6">
              <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-300 text-sm">Your camera will appear here</p>
              {startLocalStream && (
                <Button 
                  className="mt-3 bg-primary hover:bg-blue-600"
                  size="sm"
                  onClick={handleRetryCamera}
                  disabled={retrying || isInitializing}
                >
                  <Video className="h-4 w-4 mr-1" />
                  {isInitializing ? "Connecting..." : "Enable Camera"}
                </Button>
              )}
            </div>
          )}
          
          {/* Status Indicator - Simplified */}
          <div className="absolute bottom-3 left-3 flex items-center bg-gray-900 bg-opacity-75 px-2 py-0.5 rounded-md">
            <span className={`w-2 h-2 rounded-full mr-2 ${
              isCameraOff ? 'bg-gray-400' :
              interviewActive ? 'bg-green-500 animate-pulse' :
              recordingState === 'recording' ? 'bg-red-500 animate-pulse' :
              videoTrackActive ? 'bg-green-500' :
              'bg-gray-400'
            }`}></span>
            <span className="text-white text-xs">
              {isCameraOff ? "Camera Off" :
               interviewActive ? "Interview Active" :
               recordingState === 'recording' ? "Recording" : "Ready"}
            </span>
          </div>
          
          {/* Camera Controls */}
          {localStream && (
            <div className="absolute bottom-4 right-4 flex items-center space-x-2">
              <Button 
                variant="secondary"
                size="sm"
                onClick={toggleMicrophone}
                className={cn(isMicMuted && "bg-red-100 hover:bg-red-200")}
              >
                <Mic className={cn("h-4 w-4", isMicMuted && "text-red-500")} />
              </Button>
              <Button 
                variant="secondary"
                size="sm"
                onClick={toggleCamera}
                className={cn(isCameraOff && "bg-red-100 hover:bg-red-200")}
              >
                <Camera className={cn("h-4 w-4", isCameraOff && "text-red-500")} />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Background Settings</h4>
                    <BackgroundSelector onBackgroundChange={onBackgroundChange} />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
