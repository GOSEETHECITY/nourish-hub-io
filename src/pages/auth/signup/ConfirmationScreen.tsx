import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

interface Props {
  message: string;
}

export default function ConfirmationScreen({ message }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-primary rounded-2xl p-4">
            <img src={logo} alt="HarietAI" className="h-10 w-auto" />
          </div>
        </div>
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-success" />
        </div>
        <p className="text-foreground text-lg font-medium leading-relaxed">{message}</p>
        <Link to="/login">
          <Button variant="outline" className="mt-4">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
