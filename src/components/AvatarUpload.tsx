"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { uploadAvatar } from "@/lib/storage";

const CONTAINER_SIZE = 280;
const PREVIEW_SIZE = 64;
const CANVAS_SIZE = 400;

interface Props {
  currentUrl: string | null;
  userId: string;
  onUpload: (url: string) => Promise<void>;
  size?: number;
}

export default function AvatarUpload({ currentUrl, userId, onUpload, size = 80 }: Props) {
  const [showCrop, setShowCrop] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });

  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const memoryImgRef = useRef<HTMLImageElement | null>(null);

  const coverScale = naturalW && naturalH ? Math.max(CONTAINER_SIZE / naturalW, CONTAINER_SIZE / naturalH) : 1;

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        memoryImgRef.current = img;
        setNaturalW(img.naturalWidth);
        setNaturalH(img.naturalHeight);
        setImageSrc(img.src);
        setOffsetX(0);
        setOffsetY(0);
        setShowCrop(true);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setOffsetStart({ x: offsetX, y: offsetY });
  }, [offsetX, offsetY]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: t.clientX, y: t.clientY });
    setOffsetStart({ x: offsetX, y: offsetY });
  }, [offsetX, offsetY]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setOffsetX(offsetStart.x + (e.clientX - dragStart.x));
      setOffsetY(offsetStart.y + (e.clientY - dragStart.y));
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      setOffsetX(offsetStart.x + (t.clientX - dragStart.x));
      setOffsetY(offsetStart.y + (t.clientY - dragStart.y));
    };
    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStart, offsetStart]);

  const handleSave = useCallback(async () => {
    const img = memoryImgRef.current || imgRef.current;
    if (!img) return;
    setUploading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;

      const cropSize = CONTAINER_SIZE / coverScale;
      const cx = naturalW / 2 - offsetX / coverScale;
      const cy = naturalH / 2 - offsetY / coverScale;
      const sx = Math.max(0, Math.min(naturalW - cropSize, cx - cropSize / 2));
      const sy = Math.max(0, Math.min(naturalH - cropSize, cy - cropSize / 2));
      const drawSize = Math.min(cropSize, naturalW - sx, naturalH - sy);

      ctx.beginPath();
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, sx, sy, drawSize, drawSize, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) { setUploading(false); return; }

      const url = await uploadAvatar(blob, userId);
      await onUpload(url);
      setShowCrop(false);
      setUploading(false);
    } catch (err: any) {
      alert(err.message || "Upload failed");
      setUploading(false);
    }
  }, [coverScale, naturalW, naturalH, offsetX, offsetY, userId, onUpload]);

  return (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />

      <div className="relative inline-block" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full h-full rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors group relative block"
        >
          {currentUrl ? (
            <img src={currentUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-blue-100 flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </div>

      {showCrop && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget && !uploading) setShowCrop(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
              <button type="button" onClick={() => setShowCrop(false)} disabled={uploading} className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-40"><X className="w-5 h-5" /></button>
              <span className="font-semibold text-sm">Profile Photo</span>
              <button type="button" onClick={handleSave} disabled={uploading} className="p-1 text-blue-600 font-semibold text-sm hover:text-blue-700 disabled:opacity-40">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
            </div>

            {/* Crop area */}
            <div className="flex items-center justify-center p-4">
              <div
                className="relative overflow-hidden rounded-full bg-gray-900 select-none"
                style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: naturalW * coverScale,
                    height: naturalH * coverScale,
                    marginLeft: -(naturalW * coverScale) / 2 + offsetX,
                    marginTop: -(naturalH * coverScale) / 2 + offsetY,
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-[10px] text-gray-500">Preview</span>
              <div
                className="rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm"
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              >
                {imageSrc && (
                  <div
                    style={{
                      width: PREVIEW_SIZE,
                      height: PREVIEW_SIZE,
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: "50%",
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt=""
                      draggable={false}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: PREVIEW_SIZE * (naturalW * coverScale / CONTAINER_SIZE),
                        height: PREVIEW_SIZE * (naturalH * coverScale / CONTAINER_SIZE),
                        marginLeft: -(PREVIEW_SIZE * (naturalW * coverScale / CONTAINER_SIZE)) / 2 + offsetX * (PREVIEW_SIZE / CONTAINER_SIZE),
                        marginTop: -(PREVIEW_SIZE * (naturalH * coverScale / CONTAINER_SIZE)) / 2 + offsetY * (PREVIEW_SIZE / CONTAINER_SIZE),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
