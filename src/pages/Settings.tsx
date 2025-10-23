import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {} as any;
        setDisplayName(meta.display_name || "");
        setTimezone(meta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
        setAvatarUrl(meta.avatar_url || "");
      }
    })();
  }, []);

  const handleUpload = async (): Promise<string | null> => {
    if (!file) return avatarUrl || null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    const uploadedUrl = await handleUpload();
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        timezone,
        avatar_url: uploadedUrl ?? avatarUrl,
      },
    });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
      if (uploadedUrl) setAvatarUrl(uploadedUrl);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("This will permanently delete your account and data. Continue?")) return;
    const { error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error) {
      toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account deleted" });
      await supabase.auth.signOut();
      window.location.href = "/auth";
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g., America/New_York" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Picture</Label>
            {avatarUrl && (
              <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
            )}
            <Input id="avatar" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
