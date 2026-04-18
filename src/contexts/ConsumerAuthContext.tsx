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

  const buildFallbackConsumer = async (authUser: User): Promise<Consumer> => {
    const userMeta = authUser.user_metadata ?? {};
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", authUser.id)
      .maybeSingle();

    const firstName = profile?.first_name || userMeta.first_name || "";
    const lastName = profile?.last_name || userMeta.last_name || "";
    const email = profile?.email || authUser.email || "";
    const phone = profile?.phone || userMeta.phone || undefined;

    return {
      id: `fallback-${authUser.id}`,
      user_id: authUser.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      money_saved: 0,
      pounds_rescued: 0,
    };
  };

  const fetchConsumer = async (userId: string) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase
        .from("consumers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setConsumer(data as Consumer);
        if (data.city) localStorage.setItem("consumer_city", data.city);
        if ((data as any).state) localStorage.setItem("consumer_state", (data as any).state);
        return data;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    const authUser = session?.user ?? user;
    if (authUser?.id === userId) {
      const fallbackConsumer = await buildFallbackConsumer(authUser);
      setConsumer(fallbackConsumer);
      if (fallbackConsumer.city) localStorage.setItem("consumer_city", fallbackConsumer.city);
      return fallbackConsumer;
    }

    return null;
  };

  const refreshConsumer = async () => {
    if (user) await fetchConsumer(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchConsumer(session.user.id);
        } else {
          setConsumer(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchConsumer(session.user.id);
      setLoading(false);
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
