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

    const fetchConsumer = async (userId: string) => {
          const { data } = await supabase
            .from("consumers")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();
          if (data) setConsumer(data as Consumer);
          return data;
    };

    const refreshConsumer = async () => {
          if (user) {
                  await fetchConsumer(user.id);
          }
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
          </ConsumerAuthContext.Provider>ConsumerAuthCont
