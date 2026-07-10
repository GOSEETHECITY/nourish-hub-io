import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Fetch a signed URL for a receipt PDF and open it in a new tab. */
export async function openReceiptPdf(path: string) {
  const { data, error } = await supabase.storage.from("tax-receipts").createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) {
    toast.error(error?.message || "Could not open receipt");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}
