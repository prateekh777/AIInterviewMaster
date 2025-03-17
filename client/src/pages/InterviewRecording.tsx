import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";

export default function InterviewRecording() {
  const { id } = useParams();
  
  const { data: interview, error, isLoading } = useQuery({
    queryKey: ['/api/interviews', parseInt(id || '0')],
    queryFn: () => id ? fetch(`/api/interviews/${id}`).then(res => res.json()) : Promise.resolve(null),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full rounded-md" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load interview recording. The recording might not exist or there was a network error.</p>
          </CardContent>
          <CardFooter>
            <Link to="/admin">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!interview.recordingUrl) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>No Recording Available</CardTitle>
            <CardDescription>This interview does not have a recording.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>The interview was either not recorded or the recording is not available.</p>
          </CardContent>
          <CardFooter>
            <Link to="/admin">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Interview Recording</CardTitle>
          <CardDescription>
            Interview ID: {id} | Duration: {Math.floor(interview.duration / 60)}m {interview.duration % 60}s
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden bg-black">
            <VideoPlayer src={interview.recordingUrl} className="w-full aspect-video" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link to="/admin">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          
          <Link to={`/results/${id}`}>
            <Button>
              View Results
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}