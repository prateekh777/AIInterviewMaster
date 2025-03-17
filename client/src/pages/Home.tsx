import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileText, Users, Code, ChartBar } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-primary">AI Interviewer</h1>
          <Link to="/admin">
            <Button variant="outline" className="flex items-center gap-2">
              <ChartBar className="h-4 w-4" />
              Admin Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Technical Interviewer
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Conduct realistic technical interviews with our AI interviewer. Receive detailed feedback and skill assessment based on job requirements.
          </p>
          <Button
            className="mt-6 px-6 py-6 text-lg bg-primary hover:bg-blue-600"
            onClick={() => navigate("/setup")}
          >
            Start a New Interview <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">Job-Specific Questions</CardTitle>
              <FileText className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Upload your job description and our AI will generate targeted technical questions to assess candidate suitability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">Natural Conversations</CardTitle>
              <Users className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Experience human-like interview interactions with adaptive questioning based on your responses.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">Technical Deep Dives</CardTitle>
              <Code className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Detailed exploration of technical skills with dynamic difficulty adjustment based on your answers.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to improve your interview skills?</h2>
          <p className="text-gray-600 mb-6">
            Practice makes perfect. Conduct unlimited interviews and receive detailed feedback to identify your strengths and areas for improvement.
          </p>
          <Button
            className="px-6 py-3 bg-primary hover:bg-blue-600"
            onClick={() => navigate("/setup")}
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}
