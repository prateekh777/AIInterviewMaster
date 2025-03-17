import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Video, Star, Clock, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Interview {
  id: number;
  jobDescription: string;
  skills: string[];
  interviewType: string;
  difficulty: string;
  status: string;
  recordingUrl: string | null;
  duration: number;
  createdAt: string;
  updatedAt: string;
  hasResults: boolean;
  overallRating: number | null;
}

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: interviews = [], error, isLoading } = useQuery<Interview[]>({
    queryKey: ['/api/interviews'],
  });

  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };

  // Filter interviews based on search term
  const filteredInterviews = interviews?.filter((interview: Interview) => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      interview.jobDescription.toLowerCase().includes(searchTermLower) ||
      interview.skills.some(skill => skill.toLowerCase().includes(searchTermLower)) ||
      interview.difficulty.toLowerCase().includes(searchTermLower) ||
      interview.status.toLowerCase().includes(searchTermLower)
    );
  });

  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white">{status}</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load interview data. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage and review all interview sessions.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search interviews by job description, skills, or status..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Interview Sessions</CardTitle>
            <CardDescription>
              {isLoading 
                ? "Loading interview data..." 
                : `${filteredInterviews?.length || 0} total interviews found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              // Skeleton loading state
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInterviews?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No interviews found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInterviews?.map((interview: Interview) => (
                        <TableRow key={interview.id}>
                          <TableCell>{interview.id}</TableCell>
                          <TableCell>{formatDate(interview.createdAt)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {interview.jobDescription.split('\n')[0]}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                interview.difficulty === "expert" ? "destructive" : 
                                interview.difficulty === "mid-level" ? "secondary" : 
                                "outline"
                              }
                            >
                              {interview.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(interview.status)}</TableCell>
                          <TableCell>
                            {interview.overallRating ? (
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                <span>{interview.overallRating}/10</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {interview.duration ? (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{formatDuration(interview.duration)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {interview.hasResults && (
                                <Link to={`/results/${interview.id}`}>
                                  <Button variant="outline" size="sm">
                                    View Results
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              {interview.recordingUrl && (
                                <Link to={`/interviews/${interview.id}/recording`}>
                                  <Button variant="ghost" size="icon">
                                    <Video className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              <a href={`/api/interviews/${interview.id}/download-report`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}