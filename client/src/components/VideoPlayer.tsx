import { useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  className?: string;
}

export default function VideoPlayer({ src, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Load the video when the component mounts
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  return (
    <div className={cn("relative w-full", className)}>
      <video
        ref={videoRef}
        controls
        className="w-full h-full"
        preload="metadata"
      >
        <source src={src} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}