interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

interface TranscriptDisplayProps {
  messages: Message[];
}

export default function TranscriptDisplay({ messages }: TranscriptDisplayProps) {
  console.log('TranscriptDisplay rendering with messages:', messages); // Debug log

  return (
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-md p-4 min-h-[400px]"> {/* Added min-height */}
        <h2 className="text-lg font-medium mb-4 flex justify-between items-center">
          <span>Interview Transcript</span>
          <span className="text-sm text-gray-500">
            {messages.length} messages
          </span>
        </h2>
        
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No messages yet. Start the interview to begin recording the transcript.
          </div>
        ) : (
          <div className="space-y-4 h-[500px] overflow-y-auto border rounded-lg p-4"> {/* Increased height and added border */}
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${
                  message.role === 'assistant' 
                    ? 'bg-blue-50 ml-4 border-l-4 border-blue-400' 
                    : 'bg-gray-50 mr-4 border-l-4 border-gray-400'
                }`}
              >
                <div className="font-medium mb-1 flex justify-between items-center">
                  <span>{message.role === 'assistant' ? 'AI Interviewer' : 'You'}</span>
                  {message.timestamp && (
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="text-gray-700 whitespace-pre-wrap">{message.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 