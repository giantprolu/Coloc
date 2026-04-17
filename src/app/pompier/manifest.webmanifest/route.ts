import { NextResponse } from "next/server";

export async function GET() {
	const manifest = {
		name: "App Pompier",
		short_name: "Pompier",
		description: "Bouton pompier et statistiques",
		start_url: "/pompier",
		scope: "/pompier",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#dc2626",
		orientation: "portrait",
		icons: [
			{
				src: "/pompier/icon-192",
				sizes: "192x192",
				type: "image/png",
				purpose: "any maskable",
			},
			{
				src: "/pompier/icon-512",
				sizes: "512x512",
				type: "image/png",
				purpose: "any maskable",
			},
		],
		categories: ["lifestyle", "utilities"],
	};

	return NextResponse.json(manifest, {
		headers: { "Content-Type": "application/manifest+json" },
	});
}
