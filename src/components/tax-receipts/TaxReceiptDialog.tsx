import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  listing: {
    id: string;
    nonprofit_claimed_id: string | null;
    organization_id: string;
  } | null;
}

/**
 * Nonprofit-side dialog for submitting a tax receipt for a picked-up donation.
 * Two paths: upload a PDF the nonprofit already has, or let the platform
 * generate a branded IRS-compliant receipt from the donation record.
 */
export default function TaxReceiptDialog({ open, onOpenChange, listing }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const uploadReceipt = useMutation({
    mutationFn: async () => {
      if (!listing || !listing.nonprofit_claimed_id) throw new Error("Missing donation context");
      if (!file) throw new Error("Choose a PDF file");
      if (file.type !== "application/pdf") throw new Error("Only PDF files are accepted");
      if (file.size > 10 * 1024 * 1024) throw new Error("Max file size is 10 MB");

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Not signed in");

      const receiptId = crypto.randomUUID();
      const path = `${listing.organization_id}/${listing.nonprofit_claimed_id}/${listing.id}-${receiptId}.pdf`;
      const { error: upErr } = await supabase.storage.from("tax-receipts").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("tax_receipts").insert({
        food_listing_id: listing.id,
        nonprofit_id: listing.nonprofit_claimed_id,
        venue_organization_id: listing.organization_id,
        receipt_type: "uploaded",
        pdf_path: path,
        submitted_by: userId,
      });
      if (insErr) {
        await supabase.storage.from("tax-receipts").remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("Receipt submitted");
      qc.invalidateQueries({ queryKey: ["tax-receipts"] });
      setFile(null);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });

  const generateReceipt = useMutation({
    mutationFn: async () => {
      if (!listing) throw new Error("Missing donation context");
      const { data, error } = await supabase.functions.invoke("generate-tax-receipt", {
        body: { food_listing_id: listing.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      toast.success("Receipt generated");
      qc.invalidateQueries({ queryKey: ["tax-receipts"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Generation failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Tax Receipt</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="generate" className="pt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="generate">
              <FileText className="w-4 h-4 mr-2" /> Generate
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" /> Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Generate a branded IRS-compliant receipt PDF using this donation's details, your nonprofit
              info, and any itemized line entries.
            </p>
            <Button
              className="w-full"
              onClick={() => generateReceipt.mutate()}
              disabled={generateReceipt.isPending}
            >
              {generateReceipt.isPending ? "Generating..." : "Generate receipt"}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Already have your own PDF receipt? Upload it here (max 10 MB).
            </p>
            <div>
              <Label htmlFor="receipt-file">Receipt PDF</Label>
              <Input
                id="receipt-file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => uploadReceipt.mutate()}
              disabled={!file || uploadReceipt.isPending}
            >
              {uploadReceipt.isPending ? "Uploading..." : "Upload receipt"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
