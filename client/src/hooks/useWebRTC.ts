import { useState, useRef, useEffect, useCallback } from "react";

// Define recording state types for better type safety
type RecordingState = "inactive" | "recording" | "paused" | "stopping";

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>("inactive");
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [videoTrackActive, setVideoTrackActive] = useState<boolean>(true);
  
  // References
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const streamRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackEndedHandlersRef = useRef<{ [key: string]: () => void }>({});
  
  // Check if browser supports required WebRTC features
  const checkBrowserSupport = useCallback((): boolean => {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRecorder = 'MediaRecorder' in window;
    
    console.log(`Browser support check - getUserMedia: ${hasGetUserMedia}, MediaRecorder: ${hasMediaRecorder}`);
    
    return hasGetUserMedia && hasMediaRecorder;
  }, []);
  
  // Initialize media stream
  const startLocalStream = useCallback(async (): Promise<MediaStream> => {
    // If already attempting to initialize, don't start another attempt
    if (isInitializing) {
      console.log("Media stream initialization already in progress, waiting...");
      
      // Return the existing stream if available
      if (streamRef.current) {
        return streamRef.current;
      }
      
      // Otherwise wait for the initialization to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!isInitializing && streamRef.current) {
            clearInterval(checkInterval);
            resolve(streamRef.current);
          } else if (!isInitializing && !streamRef.current) {
            clearInterval(checkInterval);
            reject(new Error("Stream initialization failed"));
          }
        }, 300);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error("Stream initialization timed out"));
        }, 10000);
      });
    }
    
    // If we already have a valid stream, return it
    if (streamRef.current) {
      console.log("Reusing existing media stream");
      return streamRef.current;
    }
    
    // Start initialization
    setIsInitializing(true);
    setStreamError(null);
    
    try {
      // First check if the browser supports the required features
      if (!checkBrowserSupport()) {
        const error = "Your browser doesn't support video/audio capture or recording. Please try a different browser like Chrome or Firefox.";
        setStreamError(error);
        throw new Error(error);
      }
      
      console.log("Browser supports required features, requesting media permissions...");
      
      // First try with ideal constraints
      const idealConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };
      
      let stream: MediaStream;
      
      try {
        // Try with ideal constraints first
        stream = await navigator.mediaDevices.getUserMedia(idealConstraints);
        console.log("Stream acquired with ideal constraints");
      } catch (error) {
        console.warn("Could not get stream with ideal constraints, trying fallback:", error);
        
        // Fall back to minimal constraints
        const fallbackConstraints = {
          audio: true,
          video: true
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          console.log("Stream acquired with fallback constraints");
        } catch (fallbackError) {
          console.error("Failed to get stream with fallback constraints:", fallbackError);
          
          // Try with just audio as last resort
          const audioOnlyConstraints = {
            audio: true,
            video: false
          };
          
          try {
            stream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
            console.log("Stream acquired with audio only");
          } catch (audioOnlyError) {
            const errorMsg = `Could not access any media devices. Please check your camera and microphone permissions.`;
            console.error(errorMsg, audioOnlyError);
            setStreamError(errorMsg);
            throw new Error(errorMsg);
          }
        }
      }
      
      // Log the tracks we've acquired
      console.log("Stream acquired with tracks:", stream.getTracks().map(
        t => `${t.kind}:${t.label} (${t.enabled ? 'enabled' : 'disabled'})`
      ).join(', '));
      
      // Setup comprehensive track monitoring
      stream.getTracks().forEach(track => {
        // Generate a unique ID for this track
        const trackId = `${track.kind}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Clear any previous handlers
        if (trackEndedHandlersRef.current[trackId]) {
          delete trackEndedHandlersRef.current[trackId];
        }
        
        // Mark tracks as protected to prevent accidental stopping
        // @ts-ignore - custom property
        track._protected = true;
        
        // Create handler functions that we can reference later for cleanup
        const endedHandler = () => {
          console.warn(`Track ${track.kind} ended unexpectedly`);
          // Log track details
          console.log(`Track details: kind=${track.kind}, readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}`);
          
          // Only attempt recovery if this isn't a deliberate shutdown and we're not unmounting
          if (document.visibilityState !== 'hidden' && !isUnmountingRef.current) {
            console.log(`Attempting to recover ended ${track.kind} track`);
            
            // Set video inactive status for UI feedback
            if (track.kind === 'video') {
              setVideoTrackActive(false);
            }
            
            // Schedule immediate recovery attempt for the track
            setTimeout(async () => {
              // Double-check we haven't started unmounting
              if (!isUnmountingRef.current) {
                console.log(`Executing recovery for ended ${track.kind} track`);
                
                try {
                  // For individual track recovery, try to get just that track type
                  const constraints = {
                    audio: track.kind === 'audio',
                    video: track.kind === 'video'
                  };
                  
                  // Get a fresh track
                  const newTrackStream = await navigator.mediaDevices.getUserMedia(constraints);
                  
                  // If successful, we have two options:
                  // 1. Replace just this track in the existing stream
                  // 2. Get a completely fresh stream (more reliable but more disruptive)
                  
                  // For simplicity and reliability, we'll go with option 2
                  // Clear existing stream
                  streamRef.current = null;
                  
                  // Get completely fresh stream with all tracks
                  await startLocalStream();
                  
                  console.log(`Successfully recovered from ended ${track.kind} track`);
                } catch (err) {
                  console.error(`Failed to recover ended ${track.kind} track:`, err);
                }
              } else {
                console.log(`Skipping recovery for ${track.kind} track - component is unmounting`);
              }
            }, 300);
          }
        };
        
        const muteHandler = () => {
          console.warn(`Track ${track.kind} was muted`);
          
          // For video tracks, update UI state
          if (track.kind === 'video') {
            setVideoTrackActive(false);
          }
          
          // Schedule unmute check
          setTimeout(() => {
            if (track.muted && track.kind === 'video' && !isUnmountingRef.current) {
              console.log("Video track still muted after delay, attempting recovery");
              // This will trigger a stream recovery if needed
              if (localVideoRef.current && localStream) {
                // First try simply reattaching the stream
                localVideoRef.current.srcObject = localStream;
                localVideoRef.current.play().catch(e => {
                  console.error("Error playing video after mute recovery:", e);
                });
              }
            }
          }, 2000);
        };
        
        const unmuteHandler = () => {
          console.log(`Track ${track.kind} was unmuted`);
          if (track.kind === 'video') {
            setVideoTrackActive(true);
          }
        };
        
        // Register all event handlers
        track.onended = endedHandler;
        track.onmute = muteHandler;
        track.onunmute = unmuteHandler;
        
        // Store handler references for cleanup
        trackEndedHandlersRef.current[trackId] = endedHandler;
        
        // For debugging
        console.log(`Registered event handlers for ${track.kind} track (${trackId})`);
      });
      
      // Mark stream as protected to prevent accidental stopping
      // @ts-ignore - custom property
      stream._protected = true;
      
      // Store stream in state and ref
      setLocalStream(stream);
      streamRef.current = stream;
      
      // Also create a backup clone for recovery if needed
      try {
        // @ts-ignore - custom property
        streamRef.current._backupClone = stream.clone();
        console.log("Created backup stream clone for recovery");
      } catch (error) {
        console.warn("Failed to create backup stream clone:", error);
      }
      
      // Attach to video element if available
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Stream attached to video element");
        
        // Make sure video autoplay works
        localVideoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, playing...");
          localVideoRef.current?.play().catch(e => {
            console.error("Error auto-playing video:", e);
          });
        };
      }
      
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      streamRef.current = null;
      setLocalStream(null);
      
      const errorMessage = `Could not access camera and microphone: ${error}`;
      setStreamError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [checkBrowserSupport, isInitializing]);
  
  // Toggle microphone mute/unmute
  const toggleMicrophone = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(!isMicMuted);
    }
  };
  
  // Toggle camera on/off
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };
  
  // Reference to the recording check interval
  const recordingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start recording
  const startRecording = async () => {
    try {
      // Set flag to indicate we're not unmounting
      isUnmountingRef.current = false;
      
      let stream = localStream;
      
      // Clear any existing recording check interval
      if (recordingCheckIntervalRef.current) {
        clearInterval(recordingCheckIntervalRef.current);
        recordingCheckIntervalRef.current = null;
      }
      
      // If we don't have a localStream yet, try initializing it first
      if (!stream) {
        console.log("No stream available, initializing media stream...");
        try {
          stream = await startLocalStream();
          // Wait a moment for the stream to fully initialize
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error("Error getting media stream for recording:", error);
          throw new Error(`Could not access camera/microphone: ${error}`);
        }
      }
      
      // Double check we have a stream after potentially initializing it
      if (!stream) {
        console.error("Stream is still null after initialization attempt");
        throw new Error("No media stream available after initialization attempt");
      }
      
      // Make a clone of the stream to protect it from outside interference
      // This is crucial - it prevents the stream from being stopped by other components
      const protectedStream = stream.clone();
      
      console.log("Stream is available, starting recording with protected stream clone...");
      console.log(`Protected stream has ${protectedStream.getTracks().length} tracks`);
      
      // Initialize recording chunks array if needed
      if (!recordedChunksRef.current) {
        recordedChunksRef.current = [];
      }
      
      // Determine supported MIME types
      const supportedMimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      
      let mimeType = '';
      for (const type of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          console.log(`Supported MIME type found: ${type}`);
          mimeType = type;
          break;
        }
      }
      
      if (!mimeType) {
        console.error("No supported MIME types found");
        throw new Error('No supported media recording MIME type found');
      }
      
      // Create the MediaRecorder with the determined MIME type using our protected stream
      mediaRecorderRef.current = new MediaRecorder(protectedStream, { mimeType });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Data available: ${event.data.size} bytes, total chunks: ${recordedChunksRef.current.length + 1}`);
          recordedChunksRef.current.push(event.data);
        } else {
          console.log("Empty data received from MediaRecorder");
        }
      };
      
      mediaRecorderRef.current.onstart = () => {
        console.log("MediaRecorder started");
        setRecordingState("recording");
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder stopped unexpectedly - will restart automatically if needed");
        
        // Check if this is an unintended stop (not during unmounting or explicit stopping)
        if (!isUnmountingRef.current && recordingState !== "stopping") {
          console.log("Unexpected MediaRecorder stop detected - NOT during unmount");
          
          // Don't change the recording state, which will allow auto-restart to work
          // Schedule an immediate auto-restart attempt
          setTimeout(() => {
            if (recordingState === "recording" && !isUnmountingRef.current) {
              console.log("Attempting to auto-restart recording after unexpected stop");
              try {
                startRecording();
              } catch (error) {
                console.error("Failed to auto-restart recording after unexpected stop:", error);
              }
            }
          }, 500);
        } else {
          // This is an intentional stop during unmount or explicit stopping
          console.log("MediaRecorder stopped during intentional stop or unmount");
          if (recordingState === "stopping") {
            setRecordingState("inactive");
          }
        }
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        
        // Attempt to restart recording on error after a short delay
        setTimeout(() => {
          if (recordingState === "recording") {
            console.log("Attempting to restart recording after error...");
            try {
              startRecording();
            } catch (restartError) {
              console.error("Failed to restart recording after error:", restartError);
            }
          }
        }, 2000);
      };
      
      // Start recording with 1-second chunks
      mediaRecorderRef.current.start(1000);
      console.log("MediaRecorder.start() called");
      
      // Set up an interval to check if MediaRecorder is still running properly
      recordingCheckIntervalRef.current = setInterval(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
          if (recordingState === "recording") {
            console.log("Recording check detected inactive recorder, restarting...");
            try {
              // Only restart if we're supposed to be recording
              startRecording();
            } catch (error) {
              console.error("Failed to restart inactive recording:", error);
            }
          }
        } else {
          console.log(`Recording check: MediaRecorder active and ${mediaRecorderRef.current.state}, ${recordedChunksRef.current.length} chunks collected so far`);
        }
      }, 10000); // Check every 10 seconds
      
      return true;
    } catch (error) {
      console.error("Error starting recording:", error);
      throw new Error(`Could not start recording: ${error}`);
    }
  };
  
  // Stop recording and return the blob
  const stopRecording = async (): Promise<Blob | null> => {
    console.log("Stopping recording...");
    console.log(`Current recording state: ${recordingState}`);
    console.log(`Recorder available: ${mediaRecorderRef.current !== null}`);
    
    // First, clear any recording check interval to prevent auto-restart
    if (recordingCheckIntervalRef.current) {
      console.log("Clearing recording check interval");
      clearInterval(recordingCheckIntervalRef.current);
      recordingCheckIntervalRef.current = null;
    }
    
    // Set state to stopping to prevent auto-restart
    setRecordingState("stopping");
    
    return new Promise((resolve, reject) => {
      // If we don't have a recorder, return recorded chunks if any
      if (!mediaRecorderRef.current) {
        console.log("No MediaRecorder available to stop");
        setRecordingState("inactive");
        
        if (recordedChunksRef.current.length === 0) {
          console.log("No recorded chunks available");
          resolve(null);
        } else {
          console.log(`Creating blob from ${recordedChunksRef.current.length} previously recorded chunks`);
          const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          resolve(recordingBlob);
        }
        return;
      }
      
      // Request final data before stopping
      if (mediaRecorderRef.current.state === "recording") {
        try {
          // Request data immediately before stopping
          console.log("Requesting final data chunk before stopping");
          mediaRecorderRef.current.requestData();
        } catch (error) {
          console.error("Error requesting final data:", error);
        }
      }
      
      // Add safety timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn("Recording stop timed out");
        setRecordingState("inactive");
        
        if (recordedChunksRef.current.length === 0) {
          console.log("No recorded chunks available after timeout");
          resolve(null);
        } else {
          console.log(`Creating blob from ${recordedChunksRef.current.length} chunks after timeout`);
          const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          resolve(recordingBlob);
        }
      }, 10000);  // Increased timeout for safety
      
      // Set up the normal stop handler
      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder.onstop triggered - normal completion");
        clearTimeout(timeoutId);
        setRecordingState("inactive");
        
        // Create a final blob from all collected chunks
        if (recordedChunksRef.current.length === 0) {
          console.log("No recorded chunks available after normal stop");
          resolve(null);
        } else {
          console.log(`Creating blob from ${recordedChunksRef.current.length} chunks after normal stop`);
          const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          resolve(recordingBlob);
        }
      };
      
      // Handle stopping based on current state
      try {
        const state = mediaRecorderRef.current.state;
        console.log(`MediaRecorder current state before stop: ${state}`);
        
        if (state === "recording") {
          console.log("Stopping active MediaRecorder");
          mediaRecorderRef.current.stop();
        } else if (state === "paused") {
          console.log("Resuming paused MediaRecorder before stopping");
          mediaRecorderRef.current.resume();
          setTimeout(() => {
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
            }
          }, 100);
        } else {
          // Already inactive
          console.log("MediaRecorder already inactive, collecting existing chunks");
          clearTimeout(timeoutId);
          setRecordingState("inactive");
          
          if (recordedChunksRef.current.length === 0) {
            console.log("No recorded chunks available (already inactive)");
            resolve(null);
          } else {
            console.log(`Creating blob from ${recordedChunksRef.current.length} existing chunks`);
            const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            resolve(recordingBlob);
          }
        }
      } catch (error) {
        console.error("Error in stopRecording process:", error);
        clearTimeout(timeoutId);
        setRecordingState("inactive");
        
        // Still try to resolve with any chunks we have
        if (recordedChunksRef.current.length > 0) {
          console.log(`Creating blob from ${recordedChunksRef.current.length} chunks despite error`);
          const recordingBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          resolve(recordingBlob);
        } else {
          resolve(null);
        }
      }
    });
  };
  
  // Setup stream monitor - check stream health every 3 seconds
  useEffect(() => {
    // Only setup monitoring if we have a stream
    if (!localStream) return;

    console.log("Setting up stream health monitoring");
    
    // Clean up existing monitoring interval if any
    if (streamRefreshIntervalRef.current) {
      clearInterval(streamRefreshIntervalRef.current);
    }
    
    // Create a function to validate our stream health
    const checkStreamHealth = async () => {
      // Skip health check if we're in the middle of initialization
      if (isInitializing) return;
      
      // Check if we have any ended or inactive tracks
      const hasActiveVideoTrack = localStream.getVideoTracks().some(track => 
        track.readyState === 'live' && track.enabled);
      
      // Update video track active state
      setVideoTrackActive(hasActiveVideoTrack);
      
      if (!hasActiveVideoTrack) {
        console.warn("Video track is not active, attempting to recover");
        
        // Try automatically reconnecting stream if it's been disconnected
        if (localVideoRef.current) {
          try {
            // First check if video element is still connected properly
            const currentSrcObj = localVideoRef.current.srcObject as MediaStream;
            if (!currentSrcObj || currentSrcObj !== localStream) {
              console.log("Video element lost connection to stream, reconnecting...");
              localVideoRef.current.srcObject = localStream;
              
              // Make sure video is playing
              if (localVideoRef.current.paused) {
                await localVideoRef.current.play();
                console.log("Restarted playback on video element");
              }
            }
          } catch (error) {
            console.error("Error reconnecting video element:", error);
          }
          
          // If stream is still inactive/disconnected try recovery
          setTimeout(async () => {
            if (!localStream.getVideoTracks().some(t => t.readyState === 'live')) {
              console.log("Stream still inactive after reconnection attempt - attempting recovery");
              
              // First try using backup clone if available
              try {
                // @ts-ignore - custom property
                if (streamRef.current && streamRef.current._backupClone) {
                  console.log("Attempting recovery using backup stream clone");
                  
                  // @ts-ignore - custom property
                  const backupStream = streamRef.current._backupClone;
                  
                  // Check if backup stream has live tracks
                  const hasLiveVideoTrack = backupStream.getVideoTracks().some((t: MediaStreamTrack) => 
                    t.readyState === 'live' && t.enabled);
                  
                  if (hasLiveVideoTrack) {
                    console.log("Backup stream has live video tracks, using it for recovery");
                    
                    // Set as main stream
                    setLocalStream(backupStream);
                    
                    // Update video element
                    if (localVideoRef.current) {
                      localVideoRef.current.srcObject = backupStream;
                      await localVideoRef.current.play();
                      console.log("Reconnected video using backup stream");
                      return; // Exit early if successful
                    }
                  } else {
                    console.log("Backup stream doesn't have live video tracks, can't use for recovery");
                  }
                }
              } catch (backupError) {
                console.warn("Error using backup stream:", backupError);
              }
              
              // If backup clone recovery failed, get a completely fresh stream
              console.log("Attempting to get completely fresh stream");
              try {
                // Stop all old tracks first (if they're not already stopped)
                try {
                  localStream.getTracks().forEach(track => {
                    if (track.readyState === 'live') {
                      track.stop();
                    }
                  });
                } catch (trackError) {
                  console.warn("Error stopping old tracks:", trackError);
                }
                
                // Clear stream references
                streamRef.current = null;
                setLocalStream(null);
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Get a new stream
                const newStream = await startLocalStream();
                
                console.log("Successfully obtained new stream");
                
                // Update the video element with new stream
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = newStream;
                  await localVideoRef.current.play();
                  console.log("Reconnected video with fresh stream");
                }
              } catch (error) {
                console.error("Failed to get fresh stream:", error);
                setStreamError("Camera disconnected. Please refresh the page to reconnect.");
              }
            }
          }, 1000);
        }
      }
    };
    
    // Check immediately
    checkStreamHealth();
    
    // Then check regularly
    streamRefreshIntervalRef.current = setInterval(checkStreamHealth, 3000);
    
    // Clean up on component unmount or when stream changes
    return () => {
      if (streamRefreshIntervalRef.current) {
        clearInterval(streamRefreshIntervalRef.current);
        streamRefreshIntervalRef.current = null;
      }
    };
  }, [localStream, isInitializing, startLocalStream]);
  
  // The following flag helps us ensure we only clean up when the component is actually unmounting
  const isUnmountingRef = useRef(false);
  
  // Clean up ONLY on actual component unmount
  useEffect(() => {
    // This is the setup phase - we're not unmounting
    isUnmountingRef.current = false;
    
    // Return the cleanup function that will run when the component is truly unmounting
    return () => {
      console.log("Component ACTUALLY unmounting - performing full cleanup");
      
      // Set flag to indicate we're in the unmounting phase
      isUnmountingRef.current = true;
      
      // Clear all intervals
      if (recordingCheckIntervalRef.current) {
        clearInterval(recordingCheckIntervalRef.current);
        recordingCheckIntervalRef.current = null;
      }
      
      if (streamRefreshIntervalRef.current) {
        clearInterval(streamRefreshIntervalRef.current);
        streamRefreshIntervalRef.current = null;
      }
      
      // Stop the recorder if it's running
      if (mediaRecorderRef.current && (recordingState === "recording" || recordingState === "paused")) {
        try {
          console.log("Stopping MediaRecorder during component unmount");
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error("Error stopping MediaRecorder during unmount:", error);
        }
      }
      
      // Clean up all track handlers and stop tracks ONLY during actual unmount
      if (localStream) {
        console.log("Cleaning up media tracks during ACTUAL component unmount");
        localStream.getTracks().forEach(track => {
          // Remove all event handlers
          track.onended = null;
          track.onmute = null;
          track.onunmute = null;
          
          // Stop the track
          try {
            console.log(`Stopping ${track.kind} track during component unmount`);
            track.stop();
          } catch (error) {
            console.error(`Error stopping ${track.kind} track during unmount:`, error);
          }
        });
      }
    };
  }, []); // Empty dependency array so this only runs on mount/unmount
  
  // Function to completely stop all media tracks
  const stopAllMediaTracks = useCallback(() => {
    console.log("Explicitly stopping all media tracks");
    
    // First stop MediaRecorder if it's active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        setRecordingState("stopping");
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error("Error stopping MediaRecorder:", error);
      }
    }
    
    // Stop all tracks from local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          console.log(`Stopping ${track.kind} track`);
          track.stop();
        } catch (error) {
          console.error(`Error stopping ${track.kind} track:`, error);
        }
      });
    }
    
    // Also check streamRef for any tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          console.log(`Stopping ${track.kind} track from streamRef`);
          track.stop();
        } catch (error) {
          console.error(`Error stopping ${track.kind} track from streamRef:`, error);
        }
      });
      
      // Clear the reference
      streamRef.current = null;
    }
    
    // Clear video element srcObject
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // Reset state
    setLocalStream(null);
  }, [localStream]);
  
  return {
    localVideoRef,
    localStream,
    recordingState,
    isMicMuted,
    isCameraOff,
    isInitializing,
    streamError,
    videoTrackActive,
    checkBrowserSupport,
    startLocalStream,
    toggleMicrophone,
    toggleCamera,
    startRecording,
    stopRecording,
    stopAllMediaTracks // Export the new function
  };
}
