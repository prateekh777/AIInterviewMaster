import { Button } from "@/components/ui/button";
import { HelpCircle, Play, StopCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface InterviewControlsProps {
  onStartInterview: () => void;
  onEndInterview: () => void;
  isActive: boolean;
}

export default function InterviewControls({ onStartInterview, onEndInterview, isActive }: InterviewControlsProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <Button 
          variant={isActive ? "outline" : "default"}
          className="flex items-center gap-2"
          onClick={onStartInterview}
          disabled={isActive}
        >
          <Play className="h-4 w-4" />
          Start Interview
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
              <DialogTitle>Interview Help</DialogTitle>
              <DialogDescription>
                Tips for a successful AI interview
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
