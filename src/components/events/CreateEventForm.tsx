"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Space, ColocRule, NoiseLevel } from "@/types";
import { checkEventRules } from "@/lib/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";

interface CreateEventFormProps {
  memberId: string;
  colocationId: string;
  spaces: Space[];
  rules: ColocRule[];
}

export function CreateEventForm({
  memberId,
  colocationId,
  spaces,
  rules,
}: CreateEventFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [guestCount, setGuestCount] = useState<number | "">("");
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel>("moderate");
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<{ message: string }[]>([]);

  // Vérifie les règles en temps réel
  const checkRules = () => {
    if (!startAt || !endAt) return;

    const mockEvent = {
      id: "",
      colocation_id: colocationId,
      created_by: memberId,
      title,
      description,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      guest_count: guestCount === "" ? 0 : guestCount,
      noise_level: noiseLevel,
      status: "confirmed" as const,
      created_at: new Date().toISOString(),
    };

    const newWarnings = checkEventRules(mockEvent, rules);
    setWarnings(newWarnings);
  };

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaces((prev) =>
      prev.includes(spaceId)
        ? prev.filter((id) => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Vérifie les conflits d'espaces
      if (selectedSpaces.length > 0) {
        const { data: conflicts } = await supabase
          .from("event_spaces")
          .select("event_id, event:events(title, start_at, end_at, status)")
          .in("space_id", selectedSpaces)
          .neq("events.status", "cancelled");

        if (conflicts && conflicts.length > 0) {
          const conflictingEvents = conflicts.filter((c) => {
            const ev = (c.event as unknown) as {
              start_at: string;
              end_at: string;
              status: string;
            } | { start_at: string; end_at: string; status: string }[] | null;
            if (!ev) return false;
            const eventData = Array.isArray(ev) ? ev[0] : ev;
            if (!eventData) return false;
            const eStart = new Date(eventData.start_at);
            const eEnd = new Date(eventData.end_at);
            const newStart = new Date(startAt);
            const newEnd = new Date(endAt);
            return eStart < newEnd && eEnd > newStart;
          });

          if (conflictingEvents.length > 0) {
            toast.warning(
              "Conflit d'espace détecté ! Un espace sélectionné est déjà réservé à ce créneau."
            );
          }
        }
      }

      // Crée l'événement
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          colocation_id: colocationId,
          created_by: memberId,
          title,
          description: description || null,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          guest_count: guestCount === "" ? 0 : guestCount,
          noise_level: noiseLevel,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Associe les espaces
      if (selectedSpaces.length > 0) {
        await supabase.from("event_spaces").insert(
          selectedSpaces.map((spaceId) => ({
            event_id: event.id,
            space_id: spaceId,
          }))
        );
      }

      // Crée un canal de chat dédié à l'événement
      await supabase.from("chat_channels").insert({
        colocation_id: colocationId,
        event_id: event.id,
        name: title,
        type: "event",
      });

      // Envoie une notification push à tous les colocataires
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colocationId,
          type: "event_new",
          eventId: event.id,
          title: `Nouvel événement : ${title}`,
          body: `${title} — Cliquez pour voir les détails`,
        }),
      });

      toast.success("Événement créé avec succès !");
      router.push(`/events/${event.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avertissements des règles */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Titre */}
      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          placeholder="ex : Soirée anniversaire"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 min-w-0">
          <Label htmlFor="startAt">Début *</Label>
          <Input
            id="startAt"
            type="datetime-local"
            value={startAt}
            onChange={(e) => {
              setStartAt(e.target.value);
              checkRules();
            }}
            className="w-full text-sm"
            required
          />
        </div>
        <div className="space-y-2 min-w-0">
          <Label htmlFor="endAt">Fin *</Label>
          <Input
            id="endAt"
            type="datetime-local"
            value={endAt}
            min={startAt}
            onChange={(e) => {
              setEndAt(e.target.value);
              checkRules();
            }}
            className="w-full text-sm"
            required
          />
        </div>
      </div>

      {/* Invités et niveau sonore */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 min-w-0">
          <Label htmlFor="guestCount">Nombre d&apos;invités</Label>
          <Input
            id="guestCount"
            type="number"
            min={0}
            placeholder="0"
            value={guestCount}
            onChange={(e) => {
              const v = e.target.value;
              setGuestCount(v === "" ? "" : Math.max(0, parseInt(v) || 0));
            }}
            className="w-full"
          />
        </div>
        <div className="space-y-2 min-w-0">
          <Label htmlFor="noiseLevel">Niveau sonore</Label>
          <Select
            value={noiseLevel}
            onValueChange={(v) => setNoiseLevel(v as NoiseLevel)}
          >
            <SelectTrigger id="noiseLevel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiet">🤫 Calme</SelectItem>
              <SelectItem value="moderate">🔊 Modéré</SelectItem>
              <SelectItem value="festive">🎊 Festif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Espaces */}
      {spaces.length > 0 && (
        <div className="space-y-2">
          <Label id="spaces-label">Espaces réservés</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="spaces-label">
            {spaces.map((space) => {
              const isSelected = selectedSpaces.includes(space.id);
              return (
              <button
                key={space.id}
                type="button"
                onClick={() => toggleSpace(space.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isSelected
                    ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {space.icon && <span aria-hidden="true">{space.icon}</span>}
                {space.name}
                {isSelected && (
                  <X className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-gray-400">(optionnel)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Infos supplémentaires, courses à prévoir..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700"
        disabled={isLoading}
      >
        {isLoading ? "Création en cours..." : "Créer l'événement"}
      </Button>
    </form>
  );
}
