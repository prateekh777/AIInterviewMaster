import { useRef, useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  className?: string;
  onError?: (error: string) => void;
}

export default function VideoPlayer({ src, className, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    const errorMessage = "Failed to load video";
    setError(errorMessage);
    onError?.(errorMessage);
  };

  return (
    <div className={cn("relative w-full", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        controls
        className="w-full h-full"
        preload="metadata"
        onLoadedData={handleLoadedData}
        onError={handleError}
      >
        <source src={src} type="video/webm" />
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

// This is used for playing back recorded videos
// It's much simpler because it:
// - Takes a video source URL
// - Has basic video controls
// - Only handles playback, not live streams