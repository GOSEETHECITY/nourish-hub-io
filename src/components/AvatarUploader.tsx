import { useEffect, useRef, useState } from "react";
import { Upload, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AVATAR_ALLOWED_TYPES,
  getAvatarSignedUrl,
  removeAvatarFile,
  uploadAvatar,
} from "@/lib/avatars";

interface Props {
  userId: string;
  currentPath: string | null | undefined;
  onChange?: (path: string | null) => void;
  label?: string;
}

export default function AvatarUploader({ userId, currentPath, onChange, label = "Profile photo" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [signed, setSigned] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(currentPath ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPath(currentPath ?? null);
    getAvatarSignedUrl(currentPath).then(setSigned);
  }, [currentPath]);

  const savePath = async (newPath: string | null) => {
    const { error } = await supabase.from("profiles").update({ avatar_url: newPath }).eq("id", userId);
    if (error) throw error;
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const newPath = await uploadAvatar(userId, file);
      if (path && path !== newPath) await removeAvatarFile(path);
      await savePath(newPath);
      setPath(newPath);
      const s = await getAvatarSignedUrl(newPath);
      setSigned(s);
      onChange?.(newPath);
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    if (!path) return;
    setBusy(true);
    try {
      await removeAvatarFile(path);
      await savePath(null);
      setPath(null);
      setSigned(null);
      onChange?.(null);
      toast.success("Photo removed");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full border bg-muted overflow-hidden flex items-center justify-center">
          {signed ? (
            <img src={signed} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-7 h-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept={AVATAR_ALLOWED_TYPES.join(",")} className="hidden" onChange={onFile} />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="w-4 h-4 mr-2" />
            {busy ? "Uploading..." : path ? "Replace photo" : "Upload photo"}
          </Button>
          {path && (
            <Button type="button" variant="ghost" onClick={onRemove} disabled={busy}>
              <Trash2 className="w-4 h-4 mr-2" /> Remove
            </Button>
          )}
          <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP. Max 2 MB.</p>
        </div>
      </div>
    </div>
  );
}
