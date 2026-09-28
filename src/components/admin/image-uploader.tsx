"use client";

import { useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, LinkIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type UploadedImage = { url: string; publicId?: string | null; alt?: string | null };

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 8;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function uploadToCloudinary(file: File): Promise<UploadedImage> {
  const signRes = await fetch("/api/upload/sign", { method: "POST" });
  const sign = await signRes.json();
  if (!signRes.ok) throw new Error(sign.error ?? "Could not start upload");

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sign.apiKey);
  body.append("timestamp", String(sign.timestamp));
  body.append("signature", sign.signature);
  body.append("folder", sign.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Upload failed");
  return { url: data.secure_url, publicId: data.public_id };
}

/**
 * Uploads images straight from the browser to Cloudinary using a server-signed
 * request, or accepts a pasted image URL (useful without Cloudinary configured).
 */
export function ImageUploader({ value, onChange }: { value: UploadedImage[]; onChange: (images: UploadedImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [url, setUrl] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_IMAGES - value.length;
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) toast.warning(`Only ${MAX_IMAGES} images allowed per product`);

    const valid = selected.filter((f) => {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: use JPG, PNG, WebP or AVIF`);
        return false;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is larger than 5 MB`);
        return false;
      }
      return true;
    });

    setUploading(valid.length);
    const results = await Promise.allSettled(valid.map(uploadToCloudinary));
    setUploading(0);

    const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    results.forEach((r) => r.status === "rejected" && toast.error((r.reason as Error).message));
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function addUrl() {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
      onChange([...value, { url: parsed.toString() }]);
      setUrl("");
    } catch {
      toast.error("Enter a valid https:// image URL");
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((img, i) => (
          <div key={img.url + i} className="group relative">
            <ProductImage src={img.url} alt="" sizes="160px" className="aspect-square rounded-lg border" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 text-[10px] font-medium">Cover</span>
            )}
            <div className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <div className="flex gap-1">
                <Button type="button" size="icon-xs" variant="secondary" aria-label="Move left" onClick={() => move(i, -1)}>
                  <ArrowLeftIcon />
                </Button>
                <Button type="button" size="icon-xs" variant="secondary" aria-label="Move right" onClick={() => move(i, 1)}>
                  <ArrowRightIcon />
                </Button>
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="destructive"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                <XIcon />
              </Button>
            </div>
          </div>
        ))}
        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {uploading > 0 ? <Loader2Icon className="size-5 animate-spin" /> : <ImagePlusIcon className="size-5" />}
            {uploading > 0 ? `Uploading ${uploading}…` : "Upload"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="…or paste an image URL"
            className="pl-8"
            aria-label="Image URL"
          />
        </div>
        <Button type="button" variant="outline" onClick={addUrl} disabled={!url}>
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">JPG, PNG, WebP or AVIF up to 5 MB. The first image is the cover.</p>
    </div>
  );
}
