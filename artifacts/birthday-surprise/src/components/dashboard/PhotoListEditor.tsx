import { useRef, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { TextField, IconTextButton, SectionDivider } from "@/components/dashboard/FormFields";
import { uploadPhoto } from "@/lib/uploads";

export interface EditablePhoto {
  src: string;
  caption: string;
  rotate: number;
}

// CRUD editor for Memory Wall photos: each entry has an uploadable image
// plus a caption and a small rotation value used for the photo's tilt.
export default function PhotoListEditor({
  photos,
  onChange,
  userId,
}: {
  photos: EditablePhoto[];
  onChange: (photos: EditablePhoto[]) => void;
  userId: string;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const updatePhoto = (index: number, patch: Partial<EditablePhoto>) => {
    onChange(photos.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };
  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };
  const addPhoto = () => {
    onChange([...photos, { src: "", caption: "", rotate: 0 }]);
  };

  const handleFileChange = async (index: number, file: File | undefined) => {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const url = await uploadPhoto(userId, file);
      updatePhoto(index, { src: url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div>
      {photos.map((photo, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", letterSpacing: "0.05em" }}>
              Photo {i + 1}
            </span>
            <IconTextButton tone="danger" onClick={() => removePhoto(i)}>
              Remove
            </IconTextButton>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "10px",
                overflow: "hidden",
                flexShrink: 0,
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {uploadingIndex === i ? (
                <Spinner className="size-5" style={{ color: "var(--violet)" }} />
              ) : photo.src ? (
                <img
                  src={photo.src}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = "none";
                    const parent = el.parentElement;
                    if (parent && !parent.querySelector(".img-err-label")) {
                      const lbl = document.createElement("span");
                      lbl.className = "img-err-label";
                      lbl.textContent = "⚠️ Load error";
                      lbl.style.cssText = "font-size:9px;color:var(--ink-soft);text-align:center;padding:4px;";
                      parent.appendChild(lbl);
                    }
                  }}
                />
              ) : (
                <span style={{ fontSize: "10px", color: "var(--ink-soft)" }}>No photo</span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <input
                ref={(el) => { fileInputs.current[i] = el; }}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(i, e.target.files?.[0])}
              />
              <IconTextButton onClick={() => fileInputs.current[i]?.click()}>
                {photo.src ? "Replace photo" : "Upload photo"}
              </IconTextButton>
              <p style={{ fontSize: "0.7rem", color: "var(--ink-soft)", marginTop: "6px" }}>Up to 5MB.</p>
            </div>
          </div>

          <TextField label="Caption" value={photo.caption} onChange={(v) => updatePhoto(i, { caption: v })} />
          <TextField
            label="Tilt (degrees, e.g. -3)"
            value={String(photo.rotate)}
            onChange={(v) => updatePhoto(i, { rotate: Number(v) || 0 })}
          />
          {i < photos.length - 1 && <SectionDivider />}
        </div>
      ))}
      <IconTextButton onClick={addPhoto}>+ Add photo</IconTextButton>
    </div>
  );
}
