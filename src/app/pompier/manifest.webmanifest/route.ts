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
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		categories: ["lifestyle", "utilities"],
	};

	return NextResponse.json(manifest, {
		headers: { "Content-Type": "application/manifest+json" },
	});
}
