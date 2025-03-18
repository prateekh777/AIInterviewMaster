import { Button } from "@/components/ui/button";
import { HelpCircle, Play, StopCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface InterviewControlsProps {
  onStartInterview: () => void;
  onEndInterview: () => void;
  isActive: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  interviewType?: "technical" | "behavioral" | "mixed";
  difficulty?: "junior" | "mid-level" | "senior" | "lead";
}

export default function InterviewControls({ 
  onStartInterview, 
  onEndInterview, 
  isActive, 
  disabled, 
  isLoading,
  interviewType = 'technical',
  difficulty = 'mid-level'
}: InterviewControlsProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <Button 
          variant={isActive ? "outline" : "default"}
          className="flex items-center gap-2"
          onClick={onStartInterview}
          disabled={disabled || isActive || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isLoading ? "Starting..." : "Start Interview"}
        </Button>
      </div>
      <div className="flex space-x-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview</DialogTitle>
              <DialogDescription>
                Tips for a successful {difficulty} level AI interview
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Interview Controls</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                  <li>Click "Start Interview" to begin</li>
                  <li>Speak clearly and at a normal pace</li>
                  <li>Your responses will be transcribed automatically</li>
                  <li>Click "End Interview" when you're finished</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          variant="destructive" 
          className="flex items-center gap-2"
          onClick={onEndInterview}
          disabled={!isActive}
        >
          <StopCircle className="h-4 w-4" />
          End Interview
        </Button>
      </div>
    </div>
  );
}
