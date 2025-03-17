import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, ThumbsUp, Calendar } from "lucide-react";
import Header from "@/components/Header";

export default function ThankYou() {
  const [, navigate] = useLocation();

  // Handle page loading and check if user completed an interview
  useEffect(() => {
    // Check if this is a direct navigation (not after completing an interview)
    const interviewCompleted = sessionStorage.getItem('interview_completed');
    
    if (!interviewCompleted) {
      // User didn't complete an interview, redirect to home
      navigate("/");
      return;
    } else {
      // Clear the flag so refreshing the page will redirect
      sessionStorage.removeItem('interview_completed');
    }
    
    // Continue background processing if needed
    const interviewId = sessionStorage.getItem('interview_id');
    const duration = sessionStorage.getItem('interview_duration');
    
    if (interviewId) {
      // Clean up session storage
      sessionStorage.removeItem('interview_id');
      sessionStorage.removeItem('interview_duration');
      
      // Generate results in the background if not already done
      fetch(`/api/interviews/${interviewId}/generate-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: duration ? parseInt(duration) : 0
        }),
        credentials: 'include'
      }).catch(error => {
        console.error("Error generating results in background:", error);
      });
    }
    
    // Prevent navigation back to interview
    const handleBackButton = (e: PopStateEvent) => {
      e.preventDefault();
      navigate("/");
    };

    window.addEventListener("popstate", handleBackButton);
    
    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Header />
        
        <div className="flex items-center justify-center mt-16">
          <Card className="w-full max-w-2xl shadow-xl bg-white rounded-xl overflow-hidden">
            <div className="bg-primary text-white p-6 text-center">
              <ThumbsUp className="mx-auto h-12 w-12 mb-4" />
              <h1 className="text-2xl font-bold">Thank You for Completing Your Interview!</h1>
            </div>
            
            <CardContent className="p-8">
              <div className="space-y-6">
                <p className="text-gray-700 text-lg">
                  Your interview has been successfully recorded and submitted. Our team will review your 
                  performance and get back to you with the results soon.
                </p>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-blue-500" />
                    Next Steps
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    <li>Our team will evaluate your interview responses</li>
                    <li>You will receive detailed feedback on your performance</li>
                    <li>We will contact you regarding the next stages in the hiring process</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="px-8 pb-8 pt-0 flex justify-center">
              <Button 
                onClick={() => navigate("/")}
                className="bg-primary hover:bg-blue-600 rounded-full px-8"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}