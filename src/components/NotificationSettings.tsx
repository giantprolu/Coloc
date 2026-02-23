"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { NotificationPreferences } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

interface NotificationSettingsProps {
  memberId: string;
  initialPrefs: NotificationPreferences | null;
}

type PrefKey = keyof Omit<NotificationPreferences, "member_id">;

const prefGroups: {
  title: string;
  items: { key: PrefKey; label: string }[];
}[] = [
  {
    title: "Événements",
    items: [
      { key: "events_new", label: "Nouvel événement créé" },
      { key: "events_modified", label: "Événement modifié ou annulé" },
      { key: "events_reminder", label: "Rappel 24h avant" },
    ],
  },
  {
    title: "Chat",
    items: [
      { key: "chat_all", label: "Tous les messages" },
      { key: "chat_mentions", label: "Mentions uniquement (@moi)" },
    ],
  },
  {
    title: "Autres",
    items: [
      { key: "announcements", label: "Nouvelles annonces" },
    ],
  },
];

export function NotificationSettings({
  memberId,
  initialPrefs,
}: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<Partial<NotificationPreferences>>(
    initialPrefs || {}
  );
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setPushSupported(supported);
    if (supported) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleToggle = async (key: PrefKey) => {
    const newValue = !prefs[key];
    const prev = prefs[key];

    setPrefs((p) => ({ ...p, [key]: newValue }));

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ member_id: memberId, [key]: newValue });

    if (error) {
      setPrefs((p) => ({ ...p, [key]: prev }));
      toast.error("Impossible de sauvegarder");
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushEnabled(true);

        // Inscrit le service worker
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        });

        toast.success("Notifications push activées !");
      }
    } catch (err) {
      toast.error("Impossible d'activer les notifications push");
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifications push */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" />
            Notifications push
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pushSupported ? (
            <p className="text-sm text-gray-500">
              Les notifications push ne sont pas supportées par votre navigateur.
            </p>
          ) : pushEnabled ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Bell className="h-4 w-4" />
              <span>Notifications push activées</span>
            </div>
          ) : (
            <button
              onClick={requestPushPermission}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Activer les notifications push
            </button>
          )}
        </CardContent>
      </Card>

      {/* Préférences */}
      {prefGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {group.items.map((item, idx) => (
              <label
                key={item.key}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  idx > 0 ? "border-t" : ""
                }`}
              >
                <span className="text-sm text-gray-700">{item.label}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={prefs[item.key] ?? true}
                    onChange={() => handleToggle(item.key)}
                  />
                  <div
                    className={`h-5 w-9 rounded-full transition-colors ${
                      prefs[item.key] ?? true ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        prefs[item.key] ?? true
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
