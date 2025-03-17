import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  persistent?: boolean;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }[];
  onClose: (id: string) => void;
}

export default function Notification({
  id,
  title,
  message,
  type = 'info',
  persistent = false,
  actions = [],
  onClose
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Auto-dismiss notification after 5 seconds if not persistent
  useEffect(() => {
    if (!persistent) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // Wait for fade out animation
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [id, persistent, onClose]);
  
  // Handle close button click
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for fade out animation
  };
  
  // Set icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: <CheckCircle className="h-5 w-5 text-green-500" />, bgColor: 'bg-green-50 border-green-200' };
      case 'error':
        return { icon: <AlertCircle className="h-5 w-5 text-red-500" />, bgColor: 'bg-red-50 border-red-200' };
      case 'warning':
        return { icon: <AlertCircle className="h-5 w-5 text-amber-500" />, bgColor: 'bg-amber-50 border-amber-200' };
      case 'info':
      default:
        return { icon: <Info className="h-5 w-5 text-blue-500" />, bgColor: 'bg-blue-50 border-blue-200' };
    }
  };
  
  const { icon, bgColor } = getTypeConfig();
  
  return (
    <div 
      className={cn(
        "notification rounded-lg shadow-md p-3 flex items-start border transition-opacity duration-300",
        bgColor,
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex-shrink-0 mr-3">
        {icon}
      </div>
      <div className="flex-grow">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <p className="text-xs text-gray-600 mt-1">{message}</p>
        
        {actions.length > 0 && (
          <div className="mt-2 flex space-x-2 justify-end">
            {actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant || 'outline'}
                className="text-xs py-1 h-7"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <button 
        className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
