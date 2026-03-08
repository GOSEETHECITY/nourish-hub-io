import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/types/database";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string): Promise<{ profile: Profile | null; role: AppRole | null }> => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (roleRes.error) throw roleRes.error;

      return {
        profile: (profileRes.data as Profile | null) ?? null,
        role: (roleRes.data?.role as AppRole | null) ?? null,
      };
    } catch (err) {
      console.error("Error fetching profile/role:", err);
      return { profile: null, role: null };
    }
  };

  useEffect(() => {
    let mounted = true;
    let activeRequestId = 0;
    let authEventReceived = false;

    const applySession = (nextSession: Session | null) => {
      const requestId = ++activeRequestId;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      fetchProfileAndRole(nextSession.user.id)
        .then(({ profile: nextProfile, role: nextRole }) => {
          if (!mounted || requestId !== activeRequestId) return;
          setProfile(nextProfile);
          setRole(nextRole);
        })
        .finally(() => {
          if (!mounted || requestId !== activeRequestId) return;
          setLoading(false);
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      authEventReceived = true;
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted || authEventReceived) return;
      applySession(initialSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

