import { Navigate, useLocation } from "react-router-dom";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";

interface Props {
  children: React.ReactNode;
}

/**
 * Gates the consumer app behind authentication. If the user has no active
 * Supabase session, they're sent to /app/login. Used to wrap any /app/*
 * route that requires a logged-in consumer (everything except auth screens).
 */
export default function ConsumerAuthGuard({ children }: Props) {
  const { session, loading } = useConsumerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Send unauthenticated visitors to the consumer login. Preserve the
    // intended destination so we can return them after login.
    return (
      <Navigate
        to="/app/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
