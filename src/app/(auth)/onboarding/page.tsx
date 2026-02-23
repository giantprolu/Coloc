"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Users } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulaire création coloc
  const [displayName, setDisplayName] = useState("");
  const [room, setRoom] = useState("");
  const [colocName, setColocName] = useState("");

  // Formulaire rejoindre coloc
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinRoom, setJoinRoom] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const handleCreateColoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Non connecté");

      // Crée la colocation
      const { data: coloc, error: colocError } = await supabase
        .from("colocations")
        .insert({
          name: colocName,
          invite_code: generateInviteCode(),
        })
        .select()
        .single();

      if (colocError) throw colocError;

      // Crée le profil membre (admin)
      const { error: memberError } = await supabase.from("members").insert({
        user_id: user.id,
        colocation_id: coloc.id,
        display_name: displayName,
        room: room || null,
        role: "admin",
      });

      if (memberError) throw memberError;

      // Crée le canal de chat général
      await supabase.from("chat_channels").insert({
        colocation_id: coloc.id,
        name: "Général",
        type: "general",
      });

      // Crée les espaces par défaut
      await supabase.from("spaces").insert([
        { colocation_id: coloc.id, name: "Salon", icon: "🛋️" },
        { colocation_id: coloc.id, name: "Cuisine", icon: "🍳" },
        { colocation_id: coloc.id, name: "Terrasse", icon: "🌿" },
      ]);

      // Initialise les préférences de notification
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .eq("colocation_id", coloc.id)
        .single();

      if (member) {
        await supabase.from("notification_preferences").insert({
          member_id: member.id,
        });
      }

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinColoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Non connecté");

      // Cherche la colocation par code d'invitation
      const { data: coloc, error: colocError } = await supabase
        .from("colocations")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single();

      if (colocError || !coloc) {
        throw new Error("Code d'invitation invalide. Vérifiez le code et réessayez.");
      }

      // Vérifie que l'utilisateur n'est pas déjà membre
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .eq("colocation_id", coloc.id)
        .single();

      if (existingMember) {
        throw new Error("Vous êtes déjà membre de cette colocation.");
      }

      // Crée le profil membre
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert({
          user_id: user.id,
          colocation_id: coloc.id,
          display_name: joinDisplayName,
          room: joinRoom || null,
          role: "member",
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Initialise les préférences de notification
      await supabase.from("notification_preferences").insert({
        member_id: newMember.id,
      });

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue !</h1>
          <p className="text-gray-500 mt-2">
            Rejoignez ou créez votre colocation pour commencer
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="create">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create">
                  <Home className="mr-2 h-4 w-4" />
                  Créer une coloc
                </TabsTrigger>
                <TabsTrigger value="join">
                  <Users className="mr-2 h-4 w-4" />
                  Rejoindre
                </TabsTrigger>
              </TabsList>

              {/* Onglet création */}
              <TabsContent value="create">
                <form onSubmit={handleCreateColoc} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="colocName">Nom de la colocation</Label>
                    <Input
                      id="colocName"
                      placeholder="ex : Appart des Grands Boulevards"
                      value={colocName}
                      onChange={(e) => setColocName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Votre prénom</Label>
                    <Input
                      id="displayName"
                      placeholder="ex : Nathan"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">
                      Votre chambre{" "}
                      <span className="text-gray-400">(optionnel)</span>
                    </Label>
                    <Input
                      id="room"
                      placeholder="ex : Chambre 1"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Création en cours..." : "Créer ma colocation"}
                  </Button>
                </form>
              </TabsContent>

              {/* Onglet rejoindre */}
              <TabsContent value="join">
                <form onSubmit={handleJoinColoc} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Code d&apos;invitation</Label>
                    <Input
                      id="inviteCode"
                      placeholder="ex : ABC123"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      maxLength={6}
                      className="uppercase text-center text-lg tracking-widest font-mono"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Demandez le code à l&apos;un de vos colocataires
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinDisplayName">Votre prénom</Label>
                    <Input
                      id="joinDisplayName"
                      placeholder="ex : Nathan"
                      value={joinDisplayName}
                      onChange={(e) => setJoinDisplayName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinRoom">
                      Votre chambre{" "}
                      <span className="text-gray-400">(optionnel)</span>
                    </Label>
                    <Input
                      id="joinRoom"
                      placeholder="ex : Chambre 2"
                      value={joinRoom}
                      onChange={(e) => setJoinRoom(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Rejoindre en cours..." : "Rejoindre la colocation"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
