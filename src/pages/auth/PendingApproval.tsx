import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { LogOut, XCircle, Clock } from "lucide-react";

interface Props {
  status: "pending" | "rejected";
  type?: "venue" | "nonprofit" | "government";
}

export default function PendingApproval({ status, type }: Props) {
  const { signOut } = useAuth();

  const pendingMessages: Record<string, string> = {
    venue: "Your account is pending approval. We will notify you once your account has been reviewed.",
    nonprofit: "Your application is pending approval. We will notify you once your application has been reviewed.",
    government: "Your account is pending approval. We will notify you once your account has been reviewed.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-primary rounded-2xl p-4">
            <img src={logo} alt="HarietAI" className="h-10 w-auto" />
          </div>
        </div>

        {status === "rejected" ? (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <p className="text-foreground text-lg font-medium leading-relaxed">
              Your application was not approved. Please contact{" "}
              <a href="mailto:hello@hariet.ai" className="text-primary underline">hello@hariet.ai</a>{" "}
              for more information.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-foreground text-lg font-medium leading-relaxed">
              {pendingMessages[type || "venue"]}
            </p>
            <p className="text-muted-foreground text-sm">
              Estimated response time: 1–2 business days.
            </p>
          </>
        )}

        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
