"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { updateAvatar } from "@/app/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  memberId: string;
  displayName: string;
  currentAvatarUrl: string | null;
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Erreur lors du recadrage"));
      },
      "image/jpeg",
      0.9
    );
  });
}

export function AvatarUpload({
  displayName,
  currentAvatarUrl,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(true);

    e.target.value = "";
  };

  const handleCancel = () => {
    setCropOpen(false);
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    }
  };

  const handleConfirm = () => {
    if (!imageSrc || !croppedArea) return;

    startTransition(async () => {
      try {
        const blob = await getCroppedImg(imageSrc, croppedArea);
        const formData = new FormData();
        formData.append("avatar", blob, "avatar.jpg");

        const result = await updateAvatar(formData);
        setAvatarUrl(result.avatarUrl);
        toast.success("Photo de profil mise à jour !");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de l'upload"
        );
      } finally {
        setCropOpen(false);
        if (imageSrc) {
          URL.revokeObjectURL(imageSrc);
          setImageSrc(null);
        }
      }
    });
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="relative group"
        >
          <Avatar className="h-14 w-14">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-lg bg-indigo-100 text-indigo-700">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </div>
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <Dialog open={cropOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recadrer la photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-black">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Upload…" : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
