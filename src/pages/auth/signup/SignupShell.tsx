import { ReactNode } from "react";
import logo from "@/assets/logo.png";
import { Check } from "lucide-react";

interface Props {
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
}

export default function SignupShell({ currentStep, totalSteps, children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="bg-primary rounded-2xl p-4">
            <img src={logo} alt="HarietAI" className="h-10 w-auto" />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => {
            const step = i + 1;
            const isComplete = step < currentStep;
            const isCurrent = step === currentStep;
            return (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < totalSteps && (
                  <div className={`w-8 h-0.5 ${step < currentStep ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
