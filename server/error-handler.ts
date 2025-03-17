/**
 * Runtime error handler and type conversion utilities
 * This module provides fixes for potential type mismatches in the codebase
 */

import { Result, InsertResult } from "@shared/schema";

/**
 * Ensure that any result object is properly typed as Result
 * This helps work around any typing issues in the storage implementation
 */
export function ensureResult(result: any): Result {
  if (!result) {
    throw new Error("Result object cannot be null or undefined");
  }
  
  // Just pass through the result with correct typing
  return result as Result;
}

/**
 * Wrap MongoDB createResult to ensure proper return type
 * This function acts as a middleware between the storage implementation
 * and the rest of the application
 */
export async function wrapCreateResult(
  originalFn: (result: InsertResult) => Promise<any>,
  result: InsertResult
): Promise<Result> {
  // Call the original implementation
  const originalResult = await originalFn(result);
  
  // Ensure the result is properly typed
  return ensureResult(originalResult);
}

/**
 * Wrap MongoDB getResult to ensure proper return type
 * This function acts as a middleware between the storage implementation
 * and the rest of the application
 */
export async function wrapGetResult(
  originalFn: (id: number) => Promise<any>,
  id: number
): Promise<Result | undefined> {
  // Call the original implementation
  const originalResult = await originalFn(id);
  
  // If no result was found, return undefined
  if (!originalResult) {
    return undefined;
  }
  
  // Ensure the result is properly typed
  return ensureResult(originalResult);
}

/**
 * Wrap MongoDB getResultByInterviewId to ensure proper return type
 * This function acts as a middleware between the storage implementation
 * and the rest of the application
 */
export async function wrapGetResultByInterviewId(
  originalFn: (interviewId: number) => Promise<any>,
  interviewId: number
): Promise<Result | undefined> {
  // Call the original implementation
  const originalResult = await originalFn(interviewId);
  
  // If no result was found, return undefined
  if (!originalResult) {
    return undefined;
  }
  
  // Ensure the result is properly typed
  return ensureResult(originalResult);
}
