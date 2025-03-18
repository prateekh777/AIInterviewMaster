import { useState, useRef, useEffect, useCallback } from "react";

// Define recording state types for better type safety
type RecordingState = "inactive" | "recording" | "paused" | "stopping";

export function useWebRTC() {
  // Core states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>("inactive");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Stream Initialization
  const initializeStream = useCallback(async (): Promise<void> => {
    try {
      console.log("Initializing media stream...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setLocalStream(stream);
      streamRef.current = stream;
      setIsInitialized(true);
      console.log("Stream initialized successfully");
    } catch (error) {
      console.error("Stream initialization failed:", error);
      setStreamError(`Failed to initialize stream: ${error}`);
      throw error;
    }
  }, []);

  // 2. Track Management
  const updateTracks = useCallback(() => {
    if (!localStream) return;

    // Handle video tracks
    localStream.getVideoTracks().forEach(track => {
      if (isCameraOff) {
        track.stop();
      } else {
        track.enabled = true;
      }
    });

    // Handle audio tracks
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isMicMuted;
    });

    console.log(`Tracks updated - Camera: ${!isCameraOff}, Mic: ${!isMicMuted}`);
  }, [localStream, isCameraOff, isMicMuted]);

  // 3. Camera/Mic Controls
  const toggleCamera = useCallback(() => {
    console.log("Toggle camera called, current state:", {
      isCameraOff,
      hasLocalStream: !!localStream,
      trackCount: localStream?.getTracks().length
    });
    
    if (!localStream) return;

    if (!isCameraOff) {
      // Turning camera off
      localStream.getVideoTracks().forEach(track => {
        track.stop();
        localStream.removeTrack(track); // Remove the track from the stream
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } else {
      // Turning camera on
      navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      .then(newStream => {
        const videoTrack = newStream.getVideoTracks()[0];
        
        // First, remove any existing video tracks
        const existingVideoTracks = localStream.getVideoTracks();
        existingVideoTracks.forEach(track => {
          localStream.removeTrack(track);
          track.stop();
        });
        
        // Then add the new track
        localStream.addTrack(videoTrack);
        
        // Create a new stream with the updated tracks
        const updatedStream = new MediaStream([
          ...localStream.getAudioTracks(),
          videoTrack
        ]);
        
        // Update all references
        setLocalStream(updatedStream);
        streamRef.current = updatedStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = updatedStream;
          localVideoRef.current.play().catch(console.error);
        }
        
        console.log("Camera reinitialized with new stream");
      })
      .catch(error => {
        console.error("Failed to restart camera:", error);
        setStreamError("Failed to restart camera");
      });
    }

    setIsCameraOff(!isCameraOff);
  }, [localStream, isCameraOff]);

  const toggleMicrophone = useCallback(() => {
    if (!localStream) return;
    
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMicMuted(!isMicMuted);
  }, [localStream, isMicMuted]);

  // 4. Recording Functionality
  const startRecording = useCallback(async () => {
    if (!localStream) return;

    try {
      const mediaRecorder = new MediaRecorder(localStream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setRecordingState("recording");
      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      setStreamError("Failed to start recording");
    }
  }, [localStream]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current) return null;

    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordedChunksRef.current = [];
        setRecordingState("inactive");
        resolve(blob);
      };

      mediaRecorderRef.current!.stop();
    });
  }, []);

  // 5. Stream Health Monitoring
  useEffect(() => {
    if (!localStream || !isInitialized) return;

    const checkStreamHealth = () => {
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();

      console.log("Stream health check:", {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: !isCameraOff && videoTracks.some(t => t.enabled),
        audioEnabled: !isMicMuted && audioTracks.some(t => t.enabled),
        streamActive: localStream.active,
        tracks: localStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
          id: t.id
        }))
      });
    };

    const intervalId = setInterval(checkStreamHealth, 5000);
    return () => clearInterval(intervalId);
  }, [localStream, isInitialized, isCameraOff, isMicMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, []);

  return {
    localVideoRef,
    localStream,
    isInitialized,
    isMicMuted,
    isCameraOff,
    streamError,
    recordingState,
    isInitializing: false,
    videoTrackActive: true,
    initializeStream,
    toggleCamera,
    toggleMicrophone,
    startRecording,
    stopRecording,
    startLocalStream: initializeStream,
    stopAllMediaTracks: useCallback(() => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }, [localStream])
  };
}
