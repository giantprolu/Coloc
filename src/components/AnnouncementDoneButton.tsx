"use client";

import { useState } from "react";
import { markAnnouncementDone } from "@/app/actions/announcements";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface AnnouncementDoneButtonProps {
  announcementId: string;
}

export function AnnouncementDoneButton({ announcementId }: AnnouncementDoneButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDone = async () => {
    setIsLoading(true);
    try {
      await markAnnouncementDone(announcementId);
      toast.success("Annonce marquée comme faite !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDone}
      disabled={isLoading}
      className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
      title="C'est fait !"
    >
      <CheckCircle className="h-5 w-5" />
    </button>
  );
}
