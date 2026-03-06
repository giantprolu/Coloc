"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerUserClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/utils";

function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);
}

async function getAuthenticatedUserId(): Promise<string> {
	const supabase = await createServerUserClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Non connecté");
	return user.id;
}

export async function createColocation(
	colocName: string,
	displayName: string,
	room: string,
): Promise<{ error?: string }> {
	try {
		const userId = await getAuthenticatedUserId();
		const admin = createAdminClient();

		// Crée la colocation (admin bypass RLS)
		const { data: coloc, error: colocError } = await admin
			.from("colocations")
			.insert({ name: colocName, invite_code: generateInviteCode() })
			.select("id")
			.single();

		if (colocError) throw colocError;

		// Crée le membre admin
		const { data: member, error: memberError } = await admin
			.from("members")
			.insert({
				user_id: userId,
				colocation_id: coloc.id,
				display_name: displayName,
				room: room || null,
				role: "admin",
			})
			.select("id")
			.single();

		if (memberError) throw memberError;

		// Canal de chat général
		await admin.from("chat_channels").insert({
			colocation_id: coloc.id,
			name: "Général",
			type: "general",
		});

		// Espaces par défaut
		await admin.from("spaces").insert([
			{ colocation_id: coloc.id, name: "Salon", icon: "🛋️" },
			{ colocation_id: coloc.id, name: "Cuisine", icon: "🍳" },
			{ colocation_id: coloc.id, name: "Terrasse", icon: "🌿" },
		]);

		// Préférences de notification
		await admin
			.from("notification_preferences")
			.insert({ member_id: member.id });

		return {};
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : "Une erreur est survenue.",
		};
	}
}

export async function joinColocation(
	inviteCode: string,
	displayName: string,
	room: string,
): Promise<{ error?: string }> {
	try {
		const userId = await getAuthenticatedUserId();
		const admin = createAdminClient();

		// Cherche la coloc par code (admin bypass RLS)
		const { data: coloc, error: colocError } = await admin
			.from("colocations")
			.select("id")
			.eq("invite_code", inviteCode.toUpperCase().trim())
			.single();

		if (colocError || !coloc) {
			throw new Error(
				"Code d'invitation invalide. Vérifiez le code et réessayez.",
			);
		}

		// Vérifie si déjà membre
		const { data: existingMember } = await admin
			.from("members")
			.select("id")
			.eq("user_id", userId)
			.eq("colocation_id", coloc.id)
			.maybeSingle();

		if (existingMember) {
			throw new Error("Vous êtes déjà membre de cette colocation.");
		}

		// Crée le membre
		const { data: newMember, error: memberError } = await admin
			.from("members")
			.insert({
				user_id: userId,
				colocation_id: coloc.id,
				display_name: displayName,
				room: room || null,
				role: "member",
			})
			.select("id")
			.single();

		if (memberError) throw memberError;

		// Préférences de notification
		await admin
			.from("notification_preferences")
			.insert({ member_id: newMember.id });

		return {};
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : "Une erreur est survenue.",
		};
	}
}
