export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
	title: "App Pompier",
	description: "Bouton pompier et statistiques",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "App Pompier",
	},
	manifest: "/pompier/manifest.webmanifest",
	icons: {
		icon: "/icons/icon-192.png",
		apple: "/icons/icon-192.png",
	},
};

export const viewport: Viewport = {
	themeColor: "#dc2626",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
};

export default async function PompierLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login?next=/pompier");
	}

	// Vérifie que l'utilisateur a un profil pompier
	const { data: pompierUser } = await supabase
		.from("pompier_users")
		.select("id, colocation_id")
		.eq("user_id", user.id)
		.single();

	if (!pompierUser) {
		// Peut-être un membre coloc → vérifier
		const { data: member } = await supabase
			.from("members")
			.select("id")
			.eq("user_id", user.id)
			.single();

		if (member) {
			// C'est un membre coloc, pas un pompier externe
			redirect("/dashboard");
		}

		// Ni pompier ni membre → onboarding pompier
		redirect("/pompier/onboarding");
	}

	return (
		<div className="min-h-[100dvh] bg-gray-50">
			{/* Header minimal */}
			<header className="sticky top-0 z-40 border-b border-red-100 bg-white/80 backdrop-blur-sm">
				<div className="mx-auto max-w-md flex items-center justify-center px-4 py-3">
					<h1 className="text-lg font-bold text-red-600">
						🚒 App Pompier
					</h1>
				</div>
			</header>

			<main className="mx-auto max-w-md pb-8">
				{children}
			</main>

			<ServiceWorkerRegister swPath="/pompier-sw.js" scope="/pompier/" />
			<NotificationPrompt variant="pompier" />
			<Toaster position="top-center" richColors />
		</div>
	);
}
