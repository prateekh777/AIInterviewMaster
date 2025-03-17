import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Check, Brain, Info } from "lucide-react";
import Header from "@/components/Header";
import SkillTag from "@/components/SkillTag";
import { apiRequest } from "@/lib/queryClient";
import { useInterview } from "@/context/InterviewContext";

export default function InterviewSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setJobDescription, setSkills, setInterviewType, setDifficulty, jobDescription, skills, interviewType, difficulty } = useInterview();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJobDescription(content);
    };
    reader.readAsText(file);
  };

  const handleAnalyzeJobDescription = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Empty job description",
        description: "Please enter a job description to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiRequest('POST', '/api/analyze-job-description', { jobDescription });
      const data = await response.json();
      setSkills(data.skills);
      
      toast({
        title: "Analysis complete",
        description: "Skills and requirements extracted successfully.",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing the job description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const newSkill = input.value.trim();
      
      if (newSkill && !skills.includes(newSkill)) {
        setSkills([...skills, newSkill]);
        input.value = '';
      }
    }
  };

  const handleStartInterview = () => {
    if (skills.length === 0) {
      toast({
        title: "No skills selected",
        description: "Please analyze the job description or add skills manually.",
        variant: "destructive",
      });
      return;
    }

    navigate("/interview");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Header />
        
        <Card className="mb-8 bg-white rounded-lg shadow-md p-6 fade-in">
          <CardContent className="p-0 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview Setup</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Job Description</h3>
                <div className="relative">
                  <Textarea 
                    id="job-description" 
                    rows={6} 
                    className="resize-none bg-gray-50"
                    placeholder="Paste the job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                  <div className="absolute bottom-3 right-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-primary hover:text-blue-700" 
                      title="Upload file"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5" />
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".txt,.pdf,.docx" 
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button 
                    onClick={handleAnalyzeJobDescription} 
                    disabled={isAnalyzing || !jobDescription.trim()}
                    className="bg-primary hover:bg-blue-600"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Analyze Job Description
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Interview Focus</h3>
                
                <div className="bg-gray-50 p-3 rounded-md border border-gray-300 min-h-[120px] mb-3">
                  <div className="flex flex-wrap gap-2">
                    {skills.length > 0 ? (
                      skills.map((skill, index) => (
                        <SkillTag key={index} name={skill} onRemove={() => handleRemoveSkill(skill)} />
                      ))
                    ) : (
                      <div className="flex items-center text-gray-500 italic text-sm p-2">
                        <Info className="h-4 w-4 mr-2" />
                        <p>Skills will appear here after analyzing the job description or you can add them manually</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="text" 
                    className="mt-2 w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder-gray-400"
                    placeholder="Type a skill and press Enter to add"
                    onKeyDown={handleAddSkill}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <Label htmlFor="interview-type" className="block text-sm font-medium text-gray-700 mb-1">Interview Type</Label>
                    <Select value={interviewType} onValueChange={setInterviewType}>
                      <SelectTrigger id="interview-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid-level">Mid-level</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartInterview} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={skills.length === 0 || !interviewType || !difficulty}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Ready to Begin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
