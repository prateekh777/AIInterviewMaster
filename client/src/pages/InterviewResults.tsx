import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Star, StarHalf, Download, Share, Printer, 
  ArrowLeft, Plus, Video
} from "lucide-react";
import Header from "@/components/Header";
import { Progress } from "@/components/ui/progress";
import { CustomProgress } from "@/components/ui/custom-progress";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VideoPlayer from "@/components/VideoPlayer";

interface SkillRating {
  name: string;
  score: number;
}

interface Feedback {
  strengths: string[];
  improvements: string[];
  learningPaths: string[];
}

interface InterviewResult {
  id: string;
  overallRating: number;
  technicalProficiency: string;
  duration: number;
  recordingUrl: string | null;
  skillRatings: SkillRating[];
  feedback: Feedback;
}

export default function InterviewResults() {
  const [matchesMainRoute, mainParams] = useRoute("/results/:id");
  const [matchesAltRoute, altParams] = useRoute("/interviews/:id/results");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get ID from either route pattern
  const id = matchesMainRoute ? mainParams?.id : matchesAltRoute ? altParams?.id : undefined;
  
  const { data: result, isLoading, error } = useQuery<InterviewResult>({
    queryKey: [`/api/interviews/${id}/results`],
    retry: false,
    enabled: !!id, // Only run the query if we have an ID
  });
  
  // Handle loading states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-primary border-b-transparent border-l-transparent border-r-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading interview results...</p>
        </div>
      </div>
    );
  }
  
  // Handle undefined ID
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Header />
          <Card className="my-8">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview Not Found</h2>
              <p className="text-gray-600 mb-4">
                We couldn't find the interview you're looking for. Please check the URL and try again.
              </p>
              <Button onClick={() => navigate("/")} className="bg-primary hover:bg-blue-600">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Header />
          <Card className="my-8">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Results</h2>
              <p className="text-gray-600 mb-4">
                We couldn't load the interview results. The interview may have ended unexpectedly or the results are still being processed.
              </p>
              <Button onClick={() => navigate("/")} className="bg-primary hover:bg-blue-600">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Generate stars for rating display
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<StarHalf key={i} className="h-5 w-5 text-yellow-400 fill-current" />);
      } else {
        stars.push(<Star key={i} className="h-5 w-5 text-gray-300" />);
      }
    }
    
    return stars;
  };
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle download report
  const handleDownload = async () => {
    try {
      const response = await apiRequest('GET', `/api/interviews/${id}/download-report`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-report-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: "Your interview report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was a problem downloading your report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Header />
        
        <div className="fade-in">
          <Card className="mb-6 bg-white rounded-lg shadow-md p-6">
            <CardContent className="p-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Interview Results</h2>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Print</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Share className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    variant="default" 
                    size="sm" 
                    className="flex items-center gap-1 bg-primary hover:bg-blue-600"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Overall Rating</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {result.overallRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">/10</span>
                    <div className="ml-2 flex">
                      {renderStars(result.overallRating / 2)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Technical Proficiency</h3>
                  <div className="flex items-end">
                    <span className="text-2xl font-bold text-gray-900">
                      {result.technicalProficiency}
                    </span>
                    {result.feedback.strengths.length > 0 && (
                      <span className="text-sm text-green-600 ml-2 pb-1">
                        +{result.feedback.strengths.length} areas of excellence
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Interview Duration</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatDuration(result.duration)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">minutes</span>
                  </div>
                </div>
              </div>
              
              {result.recordingUrl && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Interview Recording</h3>
                  <VideoPlayer src={result.recordingUrl} className="w-full rounded-lg overflow-hidden" />
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Technical Skill Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {result.skillRatings.slice(0, Math.ceil(result.skillRatings.length / 2)).map((skill, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">{skill.name}</span>
                          <span className="text-sm text-gray-500">{skill.score}/10</span>
                        </div>
                        <CustomProgress 
                          value={skill.score * 10} 
                          className="h-2"
                          indicatorClassName={skill.score >= 7 ? "bg-primary" : skill.score >= 5 ? "bg-yellow-400" : "bg-red-500"}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    {result.skillRatings.slice(Math.ceil(result.skillRatings.length / 2)).map((skill, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">{skill.name}</span>
                          <span className="text-sm text-gray-500">{skill.score}/10</span>
                        </div>
                        <CustomProgress 
                          value={skill.score * 10} 
                          className="h-2"
                          indicatorClassName={skill.score >= 7 ? "bg-primary" : skill.score >= 5 ? "bg-yellow-400" : "bg-red-500"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Detailed Feedback</h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Strengths</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                      {result.feedback.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                      {result.feedback.improvements.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Recommended Learning Paths</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                      {result.feedback.learningPaths.map((path, index) => (
                        <li key={index}>{path}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <Button 
              onClick={() => navigate("/setup")}
              className="flex items-center gap-2 bg-primary hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              New Interview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
