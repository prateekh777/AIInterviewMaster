import { X } from "lucide-react";

interface SkillTagProps {
  name: string;
  onRemove: () => void;
}

export default function SkillTag({ name, onRemove }: SkillTagProps) {
  return (
    <span className="bg-blue-100 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center">
      {name}
      <button 
        className="ml-1 text-xs hover:text-red-600 p-1 rounded-full hover:bg-blue-200"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
