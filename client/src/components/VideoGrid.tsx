import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

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
  startLocalStream?: () => Promise<MediaStream>;
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
  startLocalStream
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
  
  // Enable camera/mic when stream is available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Setting video stream to video element");
      
      // Check if we need to update the video element
      const currentStream = localVideoRef.current.srcObject as MediaStream;
      if (currentStream !== localStream) {
        localVideoRef.current.srcObject = localStream;
        console.log("Updated video element with new stream");
      }
      
      // Handle tracks being stopped outside this component
      const handleTrackEnded = () => {
        console.log("A track in the stream has ended");
        // Ensure we update the UI when tracks are stopped
        if (localVideoRef.current && !localStream.getTracks().some(track => track.readyState === 'live')) {
          console.log("All tracks have ended, clearing video source");
          localVideoRef.current.srcObject = null;
        }
      };
      
      // Add ended event listeners to all tracks
      localStream.getTracks().forEach(track => {
        track.addEventListener('ended', handleTrackEnded);
      });
      
      // Add comprehensive event handlers for debugging and monitoring video stream
      localVideoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded successfully");
        // Start playing the video immediately once metadata is loaded
        localVideoRef.current?.play().catch(err => {
          console.error("Error playing video:", err);
        });
      };
      
      localVideoRef.current.oncanplay = () => {
        console.log("Video can play now");
      };
      
      localVideoRef.current.onplaying = () => {
        console.log("Video playback has started");
      };
      
      localVideoRef.current.onpause = () => {
        console.log("Video playback paused - this should not happen");
        // Auto resume if paused
        if (localVideoRef.current && localStream.active) {
          localVideoRef.current.play().catch(err => {
            console.error("Error resuming paused video:", err);
          });
        }
      };
      
      localVideoRef.current.onsuspend = () => {
        console.log("Video loading suspended");
      };
      
      localVideoRef.current.onstalled = () => {
        console.log("Video playback stalled - attempting to recover");
        // Try to recover by refreshing the stream connection
        if (localVideoRef.current && localStream.active) {
          localVideoRef.current.srcObject = null;
          setTimeout(() => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
              localVideoRef.current.play().catch(err => {
                console.error("Error recovering stalled video:", err);
              });
            }
          }, 500);
        }
      };
      
      localVideoRef.current.onerror = (event) => {
        console.error("Video element error:", event);
      };
    }
  }, [localStream]);
  
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
          
          {/* No Stream State */}
          {!localStream ? (
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
          ) : (
            <>
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
              
              {/* Connection Status Overlay */}
              {(!localStream.active || isCameraOff) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-white text-sm mb-2">
                      {isCameraOff ? "Camera is turned off" : "Video stream disconnected"}
                    </p>
                    {!isCameraOff && startLocalStream && (
                      <Button 
                        className="mt-2 bg-primary hover:bg-blue-600"
                        size="sm"
                        onClick={handleRetryCamera}
                        disabled={retrying}
                      >
                        <Video className="h-4 w-4 mr-1" />
                        {retrying ? "Reconnecting..." : "Reconnect Camera"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Status Indicator */}
          <div className="absolute bottom-3 left-3 flex items-center bg-gray-900 bg-opacity-75 px-2 py-0.5 rounded-md">
            <span className={`w-2 h-2 rounded-full mr-2 ${
              recordingState === 'recording' 
                ? 'bg-red-500 animate-pulse' 
                : (localStream && videoTrackActive && !isCameraOff)
                  ? 'bg-green-500'
                  : isInitializing || retrying
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-gray-400'
            }`}></span>
            <span className="text-white text-xs">
              {isInitializing 
                ? "Connecting..." 
                : retrying 
                  ? "Reconnecting..." 
                  : recordingState === 'recording'
                    ? "Recording"
                    : localStream && !videoTrackActive && !isCameraOff
                      ? "Camera Disconnected"
                      : "You"}
            </span>
          </div>
          
          {/* Camera Controls */}
          {localStream && (
            <div className="absolute bottom-3 right-3 flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-gray-900 bg-opacity-75 text-white hover:bg-opacity-90" 
                title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                onClick={toggleMicrophone}
              >
                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-gray-900 bg-opacity-75 text-white hover:bg-opacity-90"
                title={isCameraOff ? "Enable camera" : "Disable camera"}
                onClick={toggleCamera}
              >
                {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
