import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import InterviewSetup from "@/pages/InterviewSetup";
import InterviewSession from "@/pages/InterviewSession";
import InterviewResults from "@/pages/InterviewResults";
import InterviewRecording from "@/pages/InterviewRecording";
import AdminDashboard from "@/pages/AdminDashboard";
import ThankYou from "@/pages/ThankYou";
import { InterviewProvider } from "./context/InterviewContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setup" component={InterviewSetup} />
      <Route path="/interview" component={InterviewSession} />
      <Route path="/interviews/:id/results" component={InterviewResults} />
      <Route path="/interviews/:id/recording" component={InterviewRecording} />
      <Route path="/thank-you" component={ThankYou} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/results/:id" component={InterviewResults} /> {/* Keep for backward compatibility */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InterviewProvider>
        <Router />
        <Toaster />
      </InterviewProvider>
    </QueryClientProvider>
  );
}

export default App;
