import { createContext, useState, useContext, ReactNode } from "react";

interface InterviewContextType {
  jobDescription: string;
  setJobDescription: (description: string) => void;
  skills: string[];
  setSkills: (skills: string[]) => void;
  interviewType: "technical" | "behavioral" | "mixed";
  setInterviewType: (type: "technical" | "behavioral" | "mixed") => void;
  difficulty: "junior" | "mid-level" | "senior" | "lead";
  setDifficulty: (level: "junior" | "mid-level" | "senior" | "lead") => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [jobDescription, setJobDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interviewType, setInterviewType] = useState<"technical" | "behavioral" | "mixed">("technical");
  const [difficulty, setDifficulty] = useState<"junior" | "mid-level" | "senior" | "lead">("mid-level");

  return (
    <InterviewContext.Provider value={{
      jobDescription,
      setJobDescription,
      skills,
      setSkills,
      interviewType,
      setInterviewType,
      difficulty,
      setDifficulty
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
}
