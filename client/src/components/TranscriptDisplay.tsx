interface TranscriptDisplayProps {
  messages: Array<{
    role: 'assistant' | 'user';
    content: string;
    timestamp?: number;
  }>;
}

export default function TranscriptDisplay({ messages }: TranscriptDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <h2 className="text-lg font-medium mb-4">Interview Transcript</h2>
      <div className="h-[300px] overflow-y-auto space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'assistant' 
                ? 'bg-blue-50 ml-4' 
                : 'bg-gray-50 mr-4'
            }`}
          >
            <div className="text-sm font-medium mb-1">
              {message.role === 'assistant' ? 'AI Interviewer' : 'You'}
              {message.timestamp && (
                <span className="text-gray-400 text-xs ml-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="text-gray-700">{message.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 