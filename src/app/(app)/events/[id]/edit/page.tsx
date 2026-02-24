import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CreateEventForm } from "@/components/events/CreateEventForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("id, role, colocation_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/onboarding");

  // Récupère l'événement avec ses espaces
  const { data: event } = await supabase
    .from("events")
    .select(`
      *,
      spaces:event_spaces(space:spaces(*))
    `)
    .eq("id", id)
    .eq("colocation_id", member.colocation_id)
    .single();

  if (!event) notFound();

  // Vérifie les permissions
  const isCreator = event.created_by === member.id;
  const isAdmin = member.role === "admin";
  if (!isCreator && !isAdmin) redirect(`/events/${id}`);

  // Récupère les espaces et règles
  const [{ data: spaces }, { data: rules }] = await Promise.all([
    supabase.from("spaces").select("*").eq("colocation_id", member.colocation_id),
    supabase.from("coloc_rules").select("*").eq("colocation_id", member.colocation_id),
  ]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Modifier l&apos;événement</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mettez à jour les détails de votre événement
          </p>
        </div>
      </div>
      <CreateEventForm
        memberId={member.id}
        colocationId={member.colocation_id}
        spaces={spaces || []}
        rules={rules || []}
        mode="edit"
        event={event}
      />
    </div>
  );
}
