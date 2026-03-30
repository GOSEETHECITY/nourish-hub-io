import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  code: string | null;
  entityId: string;
  entityType: "organization" | "nonprofit";
  invalidateKey: string[];
}

function generateCode(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix + "-";
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function JoinCodeDisplay({ code, entityId, entityType, invalidateKey }: Props) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const prefix = entityType === "nonprofit" ? "NP" : "HAR";
  const table = entityType === "nonprofit" ? "nonprofits" : "organizations";

  const regenerate = useMutation({
    mutationFn: async () => {
      const newCode = generateCode(prefix);
      const { error } = await supabase.from(table).update({ join_code: newCode }).eq("id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      toast.success("Join code regenerated");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {entityType === "nonprofit" ? "Nonprofit Location Join Code" : "Location Join Code"}
        </p>
        <p className="text-lg font-mono font-bold text-foreground mt-1">
          {code || "Not generated"}
        </p>
      </div>
      {code && (
        <Button size="sm" variant="outline" onClick={copyCode}>
          <Copy className="w-3 h-3 mr-1" />
          {copied ? "Copied!" : "Copy"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
        <RefreshCw className={`w-3 h-3 mr-1 ${regenerate.isPending ? "animate-spin" : ""}`} />
        {code ? "Regenerate" : "Generate"}
      </Button>
    </div>
  );
}
