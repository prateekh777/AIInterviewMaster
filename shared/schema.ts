import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Interview model
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  jobDescription: text("job_description").notNull(),
  skills: text("skills").array().notNull(),
  interviewType: text("interview_type").notNull(),
  difficulty: text("difficulty").notNull(),
  status: text("status").notNull().default("in_progress"),
  recordingUrl: text("recording_url"),
  duration: integer("duration").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInterviewSchema = createInsertSchema(interviews).pick({
  userId: true,
  jobDescription: true,
  skills: true,
  interviewType: true,
  difficulty: true,
});

// Message model for storing interview conversation
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").references(() => interviews.id).notNull(),
  sender: text("sender").notNull(), // 'ai' or 'user'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  interviewId: true,
  sender: true,
  content: true,
});

// Results model for storing interview results
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").references(() => interviews.id).notNull().unique(),
  overallRating: integer("overall_rating").notNull(),
  technicalProficiency: text("technical_proficiency").notNull(),
  skillRatings: jsonb("skill_ratings").notNull(), // Array of { name: string, score: number }
  feedback: jsonb("feedback").notNull(), // { strengths: string[], improvements: string[], learningPaths: string[] }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResultSchema = createInsertSchema(results).pick({
  interviewId: true,
  overallRating: true,
  technicalProficiency: true,
  skillRatings: true,
  feedback: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;

// Define more specific types for frontend use
export type SkillRating = {
  name: string;
  score: number;
};

export type Feedback = {
  strengths: string[];
  improvements: string[];
  learningPaths: string[];
};
