# PR Review Complète — ColocEvents

**Date :** 2026-03-08
**Branch :** `main` (commit `1b92d15`)
**Résultat :** 3 erreurs ESLint, 20 warnings, 14 problèmes identifiés manuellement

---

## Résumé

| Sévérité | Nombre | Catégorie principale |
|----------|--------|----------------------|
| Critique | 5 | Sécurité |
| Haute | 3 | Robustesse / TypeScript |
| Moyenne | 3 | Anti-patterns React (ESLint errors) |
| Basse | 6 | Qualité de code, performance, DX |

---

## CRITIQUE — Sécurité

### 1. `/api/push/send` — Aucune authentification ni autorisation

**Fichier :** `src/app/api/push/send/route.ts` (lignes 13-78)

L'endpoint POST n'effectue aucun check d'authentification. N'importe qui peut envoyer des notifications push à n'importe quelle colocation en fournissant un `colocationId` arbitraire.

**Impact :** Spam de notifications, usurpation, fuite d'information sur les membres.

**Correction proposée :**

```typescript
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Vérifier que l'utilisateur appartient à la colocation
  const { data: member } = await supabase
    .from("members")
    .select("id, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member || member.colocation_id !== colocationId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // ...
}
```

De plus, aucune validation de type ni de longueur n'est effectuée sur les paramètres `title`, `body`, `eventId`. Un `eventId` malveillant est directement injecté dans un path (ligne 50) sans sanitization.

---

### 2. Comparaison du secret cron vulnérable aux timing attacks

**Fichiers :**
- `src/app/api/cron/reminders/route.ts:17`
- `src/app/api/cron/announcements-cleanup/route.ts:14`

```typescript
// Actuel — vulnérable
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {

// Correction — timing-safe
import { timingSafeEqual } from "crypto";

const expected = `Bearer ${process.env.CRON_SECRET}`;
if (
  !authHeader ||
  authHeader.length !== expected.length ||
  !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
) {
```

---

### 3. Console.log de données sensibles en production

**Fichier :** `src/app/actions/auth.ts:10-25`

L'email de l'utilisateur et l'URL de reset (contenant potentiellement des tokens) sont loggés en clair dans les logs serveur.

```typescript
// À supprimer
console.log("[forgot-password] Sending reset email to:", email);
console.log("[forgot-password] Redirect URL:", `${origin}/auth/callback?next=/reset-password`);
console.log("[forgot-password] Success, response:", JSON.stringify(data));
```

---

### 4. `bodySizeLimit: "50mb"` excessif

**Fichier :** `next.config.ts:6`

50 MB pour les server actions est largement surdimensionné et ouvre la porte à du DoS par envoi de payloads volumineux.

**Correction :** Réduire à `5mb` ou `10mb` selon le besoin réel (upload d'avatar = quelques MB max).

---

### 5. Aucun header de sécurité configuré

**Fichier :** `next.config.ts`

Aucun header HTTP de sécurité n'est défini : pas de Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security.

**Correction proposée :**

```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=()" },
        ],
      },
    ];
  },
};
```

---

## HAUTE — Robustesse

### 6. Aucun `error.tsx` dans l'application

Aucun error boundary n'existe dans `src/app/`. Si un composant serveur throw une erreur, l'utilisateur voit une page blanche sans possibilité de retour.

**Correction :** Créer au minimum `src/app/(app)/error.tsx` :

```tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold text-gray-900">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-gray-500">
        {error.message || "Veuillez réessayer."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
```

---

### 7. Unsafe type casts dans `useRealtimeChat.ts`

**Fichier :** `src/hooks/useRealtimeChat.ts` (lignes 122, 126, 130, 142, 157, 170, 192)

Multiples `as unknown as { new: { id: string } }` sans validation runtime. Si le payload Supabase change de structure, l'app crash silencieusement.

**Correction :** Ajouter une garde de type :

```typescript
function hasId(payload: unknown): payload is { id: string } {
  return typeof payload === "object" && payload !== null && "id" in payload && typeof (payload as { id: string }).id === "string";
}

// Utilisation
.on("broadcast", { event: "new_message" }, async ({ payload }) => {
  if (!hasId(payload)) return;
  await fetchAndMerge(payload.id);
})
```

---

### 8. Dépendance manquante `supabase` dans les hooks

**Fichiers :**
- `src/hooks/usePresence.ts:77`
- `src/hooks/useRealtimeReactions.ts:23`
- `src/hooks/useRealtimeReactions.ts:72`

ESLint signale : `React Hook useEffect has a missing dependency: 'supabase'`.

La variable `supabase` est créée via `useMemo(() => createClient(), [])` donc elle est stable, mais ESLint ne le sait pas. Ajouter `supabase` dans les tableaux de dépendances pour corriger le warning.

---

## MOYENNE — Anti-patterns React (3 erreurs ESLint)

### 9. `setState` synchrone dans un `useEffect`

Appeler `setState` directement dans le body d'un `useEffect` provoque des re-renders en cascade.

| Fichier | Ligne | Variable |
|---------|-------|----------|
| `src/components/InstallAppButton.tsx` | 15 | `setIsStandalone(...)` |
| `src/components/NotificationSettings.tsx` | 56 | `setPushSupported(...)` |
| `src/components/PasswordBanner.tsx` | 24 | `setVisible(true)` |

**Correction type — utiliser un initializer lazy :**

```typescript
// Avant
const [isStandalone, setIsStandalone] = useState(false);
useEffect(() => {
  setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
}, []);

// Après
const [isStandalone] = useState(
  () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
);
```

---

## BASSE — Qualité de code & Performance

### 10. Imports et variables inutilisés (20 warnings ESLint)

| Fichier | Ligne(s) | Élément(s) inutilisé(s) |
|---------|----------|--------------------------|
| `src/app/(app)/dashboard/page.tsx` | 9 | `Bell` |
| `src/app/(app)/settings/page.tsx` | 5, 7, 9 | `Copy`, `LogOut`, `User` |
| `src/app/(app)/settings/page.tsx` | 22 | `Avatar`, `AvatarFallback`, `AvatarImage` |
| `src/app/(app)/settings/page.tsx` | 26 | `getInitials` |
| `src/app/actions/chat.ts` | 278 | `member` |
| `src/components/CalendarView.tsx` | 20, 34 | `formatDate`, `memberId` |
| `src/components/NotificationSettings.tsx` | 3 | `BellOff` |
| `src/components/NotificationSettings.tsx` | 101 | `err` |
| `src/components/PresenceToggle.tsx` | 27 | `returnDate` |
| `src/components/chat/MessageBubble.tsx` | 7 | `ChatMessageReaction` |
| `src/components/events/ReactionBar.tsx` | 25 | `colocationId` |
| `src/components/expenses/NewExpenseForm.tsx` | 91 | `err` |

---

### 11. Pas de pagination dans le chat

**Fichier :** `src/hooks/useRealtimeChat.ts:86`

`fetchChatMessages(channelId, 50)` charge les 50 derniers messages sans possibilité de scroll infini. Les anciens messages sont inaccessibles.

---

### 12. `NotificationPrompt.tsx` — fetch sans error handling

**Fichier :** `src/components/NotificationPrompt.tsx:36`

Le `fetch` vers `/api/push/subscribe` n'a pas de `try-catch`. Le toast affiche "Notifications activées !" même si la requête échoue.

---

### 13. Création d'événements côté client au lieu de server actions

**Fichier :** `src/components/events/CreateEventForm.tsx:170-203`

Le formulaire insère directement dans les tables `events`, `event_spaces` et `chat_channels` via le client Supabase. Cela contourne potentiellement les server actions et repose entièrement sur les RLS policies.

**Recommandation :** Migrer vers une server action pour centraliser la validation et la logique métier.

---

### 14. Navbar chevauche la barre de chat (corrigé)

**Fichier :** `src/components/chat/ChatWindow.tsx:324`

Le calcul `height: calc(100dvh - 80px)` ne tenait pas compte du `safe-area-inset-bottom` sur les appareils avec notch/Dynamic Island.

**Correction appliquée :**

```typescript
// Avant
{ height: "calc(100dvh - 80px)" }

// Après
{ height: "calc(100dvh - 5rem - env(safe-area-inset-bottom, 0px))" }
```

---

## Checklist de correction

- [ ] Sécuriser `/api/push/send` (auth + validation + sanitization eventId)
- [ ] Comparaison timing-safe pour les cron secrets
- [ ] Supprimer les console.log de données sensibles dans `auth.ts`
- [ ] Réduire `bodySizeLimit` à `5mb`
- [ ] Ajouter les headers de sécurité dans `next.config.ts`
- [ ] Créer `src/app/(app)/error.tsx` (error boundary)
- [ ] Ajouter des type guards dans `useRealtimeChat.ts`
- [ ] Ajouter `supabase` aux dépendances des hooks
- [ ] Refactorer les 3 `setState` dans `useEffect` en initializers lazy
- [ ] Nettoyer les 20 imports/variables inutilisés
- [ ] Ajouter try-catch dans `NotificationPrompt.tsx`
- [x] Corriger le chevauchement navbar/chat (safe-area-inset-bottom)
