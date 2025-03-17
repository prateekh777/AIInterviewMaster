import { useState } from "react";
import { useLocation } from "wouter";
import { Wifi, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Header() {
  const [location, navigate] = useLocation();
  const [isConnected] = useState(true);

  return (
    <header className="mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
          <span className="material-icons text-primary mr-2">smart_toy</span>
          <h1 className="text-2xl font-semibold text-gray-900">AI Interviewer</h1>
        </div>
        <div className="hidden sm:flex items-center text-gray-500 space-x-4">
          <div id="connection-status" className="flex items-center">
            <div className={`w-2 h-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-2 pulse`}></div>
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-700 hover:text-primary transition">
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
                <SheetDescription>
                  Configure your AI interview experience
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-transcribe">Auto Transcription</Label>
                    <p className="text-sm text-gray-500">
                      Automatically transcribe speech to text
                    </p>
                  </div>
                  <Switch id="auto-transcribe" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="voice-responses">Voice Responses</Label>
                    <p className="text-sm text-gray-500">
                      Enable AI voice responses
                    </p>
                  </div>
                  <Switch id="voice-responses" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="video-recording">Video Recording</Label>
                    <p className="text-sm text-gray-500">
                      Record video during interview
                    </p>
                  </div>
                  <Switch id="video-recording" defaultChecked />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
