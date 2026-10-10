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
  referral_code?: string;
}

interface ConsumerAuthContextType {
  user: User | null;
  session: Session | null;
  consumer: Consumer | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshConsumer: () => Promise<void>;
  consumerError: string | null;
}

const ConsumerAuthContext = createContext<ConsumerAuthContextType>({
  user: null,
  session: null,
  consumer: null,
  loading: true,
  signOut: async () => {},
  refreshConsumer: async () => {},
  consumerError: null,
});

export const useConsumerAuth = () => useContext(ConsumerAuthContext);

export const ConsumerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [consumer, setConsumer] = useState<Consumer | null>(null);
  const [loading, setLoading] = useState(true);
  const [consumerError, setConsumerError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

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
        setConsumerError(null);
        const nextConsumer = {
          ...(data as Consumer),
          first_name: data.first_name || fallbackFields?.first_name || "",
          last_name: data.last_name || fallbackFields?.last_name || "",
          email: data.email || fallbackFields?.email || "",
          phone: data.phone || fallbackFields?.phone,
        } as Consumer;
        setConsumer(nextConsumer);
        // Do NOT sync city/state to localStorage here — the consumers table only
        // stores city, so writing a stale state causes mismatches like "Orlando, MD".
        // LocationContext owns the city/state pairing.
        return nextConsumer;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Never fabricate a consumer id — surface the failure with a retry option.
    setConsumer(null);
    setConsumerError("We couldn't load your account. Please check your connection and try again.");
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
        setConsumerError(null);
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
    setConsumerError(null);
  };

  const retry = async () => {
    if (!user) return;
    setRetrying(true);
    setConsumerError(null);
    await fetchConsumer(user.id, user);
    setRetrying(false);
  };

  return (
    <ConsumerAuthContext.Provider value={{ user, session, consumer, loading, signOut, refreshConsumer, consumerError }}>
      {children}
      {consumerError && user && (
        <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl bg-white border border-red-200 shadow-lg p-4 flex items-center gap-3">
          <p className="text-sm text-[#1B2A4A] flex-1">{consumerError}</p>
          <button onClick={retry} disabled={retrying} className="px-4 py-2 rounded-full bg-[#F97316] text-white text-sm font-bold disabled:opacity-50">
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}
    </ConsumerAuthContext.Provider>
  );
};
