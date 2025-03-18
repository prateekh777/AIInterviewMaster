// Utility functions for media recording

// Export these types for consistency
export type RecordingState = "inactive" | "recording" | "paused" | "stopping";

// Add error types
export interface MediaError extends Error {
  name: string;
  message: string;
}

// Start media stream
export async function startMediaStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
  const defaultConstraints = {
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw new MediaError(`Failed to access camera and microphone: ${error}`);
  }
}

// Create a media recorder
export function createMediaRecorder(stream: MediaStream, onDataAvailable: (event: BlobEvent) => void): MediaRecorder {
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
      mimeType = type;
      break;
    }
  }
  
  if (!mimeType) {
    throw new Error('No supported media recording MIME type found');
  }
  
  const recorder = new MediaRecorder(stream, { mimeType });
  
  // Set up event handlers
  recorder.ondataavailable = onDataAvailable;
  
  return recorder;
}

// Convert recorded chunks to a blob
export function createRecordingBlob(chunks: Blob[], mimeType = 'video/webm'): Blob {
  return new Blob(chunks, { type: mimeType });
}

// Generate a URL for the recording blob
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

// Clean up a blob URL
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// Download recording
export function downloadRecording(blob: Blob, filename = 'interview-recording.webm'): void {
  const url = createBlobUrl(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    revokeBlobUrl(url);
  }, 100);
}

// Upload recording to server
export async function uploadRecording(blob: Blob, url: string, filename = 'recording.webm'): Promise<Response> {
  const formData = new FormData();
  formData.append('recording', blob, filename);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
}
