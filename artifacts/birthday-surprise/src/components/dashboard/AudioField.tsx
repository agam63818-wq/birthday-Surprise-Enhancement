import { useRef, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { FieldLabel } from "@/components/auth/AuthLayout";
import { IconTextButton } from "@/components/dashboard/FormFields";
import { uploadAudio } from "@/lib/uploads";

// Single audio upload slot (background music or birthday song) with a
// current-file preview and a "Replace" upload button.
export default function AudioField({
  label,
  value,
  onChange,
  userId,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  userId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAudio(userId, file);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audio upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        {uploading ? (
          <Spinner className="size-5" style={{ color: "var(--violet)" }} />
        ) : value ? (
          <audio controls src={value} style={{ height: "32px", maxWidth: "220px" }} />
        ) : (
          <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>No audio set</span>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          style={{ display: "none" }}
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
        <IconTextButton onClick={() => fileInput.current?.click()}>
          {value ? "Replace" : "Upload"}
        </IconTextButton>
      </div>
      <p style={{ fontSize: "0.7rem", color: "var(--ink-soft)", marginTop: "6px" }}>Up to 10MB.</p>
    </div>
  );
}
