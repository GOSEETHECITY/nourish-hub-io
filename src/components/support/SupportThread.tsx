import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export interface SupportMessage {
  id: string;
  support_request_id: string;
  sender_user_id: string | null;
  sender_name: string | null;
  sender_role: string;
  body: string;
  is_system: boolean;
  created_at: string;
}

interface Props {
  requestId: string;
  /** Seed entry: the original request body, rendered first in the timeline. */
  original: { name: string | null; role: string; body: string; created_at: string };
  isAdmin?: boolean;
}

/** Chronological support conversation with a reply box, shared by admin and partners. */
export default function SupportThread({ requestId, original, isAdmin = false }: Props) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["support-messages", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("support_request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as SupportMessage[];
    },
  });

  // Mark the thread read for whichever participant is viewing it.
  useEffect(() => {
    supabase.rpc("mark_support_thread_viewed" as never, { p_request_id: requestId } as never).then(() => {
      queryClient.invalidateQueries({ queryKey: ["support-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-support"] });
    });
  }, [requestId, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("support-thread", {
        body: { request_id: requestId, action: "reply", body: reply.trim() },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      return data as { reopened?: boolean };
    },
    onSuccess: (data) => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["support-messages", requestId] });
      queryClient.invalidateQueries({ queryKey: ["support-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-support"] });
      toast.success(data?.reopened ? "Reply sent — request reopened" : "Reply sent");
    },
    onError: (e: Error) => toast.error(e.message || "Could not send reply"),
  });

  return (
    <div className="space-y-4">
      <div className="max-h-[45vh] overflow-y-auto space-y-3 pr-1">
        <Entry
          name={original.name}
          role={original.role}
          body={original.body}
          created_at={original.created_at}
          isSystem={false}
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        ) : (
          messages.map((m) => (
            <Entry
              key={m.id}
              name={m.sender_name}
              role={m.sender_role}
              body={m.body}
              created_at={m.created_at}
              isSystem={m.is_system}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="space-y-2 border-t pt-4">
        <Textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={isAdmin ? "Reply to the partner..." : "Reply to support..."}
        />
        <Button
          onClick={() => send.mutate()}
          disabled={reply.trim().length < 2 || send.isPending}
          className="w-full sm:w-auto"
        >
          {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Send reply
        </Button>
      </div>
    </div>
  );
}

function Entry({
  name,
  role,
  body,
  created_at,
  isSystem,
}: { name: string | null; role: string; body: string; created_at: string; isSystem: boolean }) {
  if (isSystem) {
    return (
      <p className="text-xs text-muted-foreground text-center py-1">
        {body} · {new Date(created_at).toLocaleString()}
      </p>
    );
  }
  const isAdminMsg = role === "admin";
  return (
    <div className={`rounded-lg border p-3 ${isAdminMsg ? "bg-muted/60" : "bg-card"}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{name || "Unknown"}</span>
        <span className="capitalize">{isAdminMsg ? "Support team" : role}</span>
        <span>·</span>
        <span>{new Date(created_at).toLocaleString()}</span>
      </div>
      <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap break-words">{body}</p>
    </div>
  );
}
