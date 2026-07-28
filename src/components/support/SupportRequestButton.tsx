import { useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  organizationName?: string | null;
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
}

/** Support request modal available from every partner dashboard. */
export default function SupportRequestButton({ organizationName, variant = "outline", className }: Props) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();

  const submit = async () => {
    if (message.trim().length < 5) {
      toast({ title: "Add a bit more detail", description: "Tell us what you need help with.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("submit-support-request", {
      body: {
        subject: subject.trim() || "Support request",
        message: message.trim(),
        organization_name: organizationName ?? "",
        user_name: name,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not send", description: (data as any)?.error ?? error?.message ?? "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Message sent", description: "Our team will reply by email shortly." });
    setSubject("");
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      <Button variant={variant} size="sm" className={className} onClick={() => setOpen(true)}>
        <Headphones className="w-4 h-4 mr-2" /> Support
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
            <DialogDescription>We reply by email, usually within one business day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name || "—"} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <Input value={organizationName ?? "—"} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-message">Message</Label>
              <Textarea id="support-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you need help with." />
            </div>
            <Button className="w-full" onClick={submit} disabled={sending}>
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending</> : "Send message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
