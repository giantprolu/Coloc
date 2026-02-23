"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Impossible d'envoyer le lien. Vérifiez votre adresse email.");
    } else {
      setIsSent(true);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
            <Home className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">ColocEvents</CardTitle>
          <CardDescription>
            Gérez facilement votre vie en colocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSent ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">📧</div>
              <p className="font-medium text-gray-900">Vérifiez vos emails !</p>
              <p className="text-sm text-gray-500">
                Un lien de connexion a été envoyé à{" "}
                <span className="font-medium">{email}</span>
              </p>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setIsSent(false)}
              >
                Utiliser une autre adresse
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="toi@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Envoi en cours..." : "Recevoir un lien de connexion"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
