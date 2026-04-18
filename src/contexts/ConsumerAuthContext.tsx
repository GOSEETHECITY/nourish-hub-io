import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Consumer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  zip_code?: string;
  city?: string;
  date_of_birth?: string;
  avatar_url?: string;
  money_saved: number;
  pounds_rescued: number;
  invite_code_used?: string;
}

interface ConsumerAuthContextType {
  user: User | null;
  session: Session | null;
  consumer: Consumer | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshConsumer: () => Promise<void>;
}

const ConsumerAuthContext = createContext<ConsumerAuthContextType>({
  user: null,
  session: null,
  consumer: null,
  loading: true,
  signOut: async () => {},
  refreshConsumer: async () => {},
});

export const useConsumerAuth = () => useContext(ConsumerAuthContext);

export const ConsumerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileFallback = async (authUser: User) => {
    const userMeta = authUser.user_metadata ?? {};
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", authUser.id)
      .maybeSingle();

    return {
      first_name: profile?.first_name || userMeta.first_name || "",
      last_name: profile?.last_name || userMeta.last_name || "",
      email: profile?.email || authUser.email || "",
      phone: profile?.phone || userMeta.phone || undefined,
    };
  };

  const fetchConsumer = async (userId: string, authUser?: User | null) => {
    const fallbackFields = authUser ? await fetchProfileFallback(authUser) : null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase
        .from("consumers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        const nextConsumer = {
          ...(data as Consumer),
          first_name: data.first_name || fallbackFields?.first_name || "",
          last_name: data.last_name || fallbackFields?.last_name || "",
          email: data.email || fallbackFields?.email || "",
          phone: data.phone || fallbackFields?.phone,
        } as Consumer;
        setConsumer(nextConsumer);
        if (nextConsumer.city) localStorage.setItem("consumer_city", nextConsumer.city);
        if ((data as any).state) localStorage.setItem("consumer_state", (data as any).state);
        return nextConsumer;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (authUser?.id === userId) {
      const fallbackConsumer: Consumer = {
        id: `fallback-${authUser.id}`,
        user_id: authUser.id,
        first_name: fallbackFields?.first_name || "",
        last_name: fallbackFields?.last_name || "",
        email: fallbackFields?.email || authUser.email || "",
        phone: fallbackFields?.phone,
        money_saved: 0,
        pounds_rescued: 0,
      };
      setConsumer(fallbackConsumer);
      return fallbackConsumer;
    }

    return null;
  };

  const refreshConsumer = async () => {
    if (user) await fetchConsumer(user.id, user);
  };

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        void fetchConsumer(nextSession.user.id, nextSession.user);
      } else {
        setConsumer(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      applySession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setConsumer(null);
  };

  return (
    <ConsumerAuthContext.Provider value={{ user, session, consumer, loading, signOut, refreshConsumer }}>
      {children}
    </ConsumerAuthContext.Provider>
  );
};
