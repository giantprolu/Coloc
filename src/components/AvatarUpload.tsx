"use client";

import { useRef, useState, useTransition } from "react";
import { updateAvatar } from "@/app/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  memberId: string;
  displayName: string;
  currentAvatarUrl: string | null;
}

export function AvatarUpload({
  displayName,
  currentAvatarUrl,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 2 Mo");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      try {
        const result = await updateAvatar(formData);
        setAvatarUrl(result.avatarUrl);
        toast.success("Photo de profil mise à jour !");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de l'upload"
        );
      }
    });

    // Reset input
    e.target.value = "";
  };

  return (
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
  );
}
