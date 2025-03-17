import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to catch unhandled rejections and errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  // If the reason is an Error object, log its stack trace
  if (event.reason instanceof Error) {
    console.error('Error details:', {
      message: event.reason.message,
      stack: event.reason.stack,
      name: event.reason.name
    });
  } else {
    console.error('Rejection details (not an Error object):', event.reason);
  }
});

window.addEventListener('error', (event) => {
  console.error('GLOBAL ERROR:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

createRoot(document.getElementById("root")!).render(
  <App />
);
