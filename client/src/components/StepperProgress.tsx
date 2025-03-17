import { cn } from "@/lib/utils";

interface StepperProgressProps {
  currentStep: number;
}

export default function StepperProgress({ currentStep }: StepperProgressProps) {
  const steps = [
    { id: 1, name: "Setup" },
    { id: 2, name: "Basics" },
    { id: 3, name: "Technical" },
    { id: 4, name: "Deep-dive" },
    { id: 5, name: "Summary" }
  ];
  
  // Calculate progress width
  const progressWidth = `${(currentStep - 1) * 25}%`;
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="w-full">
          <div className="flex items-center justify-between relative">
            {/* Progress bar background */}
            <div className="w-full h-1 bg-gray-200 absolute"></div>
            {/* Active progress */}
            <div 
              className="h-1 bg-primary absolute transition-all duration-500" 
              style={{ width: progressWidth }}
            ></div>
            
            {steps.map((step) => (
              <div key={step.id} className="relative flex flex-col items-center">
                <div 
                  className={cn(
                    "rounded-full w-8 h-8 flex items-center justify-center text-sm z-10",
                    step.id === currentStep 
                      ? "bg-primary text-white" 
                      : step.id < currentStep
                        ? "bg-primary text-white"
                        : "bg-white border-2 border-gray-300 text-gray-500"
                  )}
                >
                  {step.id}
                </div>
                <span className={cn(
                  "text-xs mt-1 font-medium",
                  step.id === currentStep 
                    ? "text-gray-900" 
                    : step.id < currentStep
                      ? "text-gray-900"
                      : "text-gray-500"
                )}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
