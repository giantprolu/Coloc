import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Ne pas intercepter les routes API
	if (pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// Rafraîchit la session si elle existe
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Routes publiques (non protégées)
	const publicRoutes = [
		"/login",
		"/signup",
		"/auth/callback",
		"/forgot-password",
		"/reset-password",
	];
	const isPublicRoute = publicRoutes.some((route) =>
		pathname.startsWith(route),
	);

	// Redirige les utilisateurs non connectés vers /login
	if (!user && !isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		// Préserve la destination pour les routes pompier
		if (pathname.startsWith("/pompier")) {
			url.searchParams.set("next", "/pompier");
		}
		return NextResponse.redirect(url);
	}

	// Redirige les utilisateurs connectés loin des pages d'auth
	// (sauf /reset-password qui nécessite une session active)
	if (
		user &&
		isPublicRoute &&
		!pathname.startsWith("/auth") &&
		!pathname.startsWith("/reset-password")
	) {
		// Préserver le paramètre next pour les redirections pompier
		const next = request.nextUrl.searchParams.get("next");
		const url = request.nextUrl.clone();
		url.pathname = next?.startsWith("/pompier") ? "/pompier" : "/dashboard";
		url.search = "";
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, sw.js, manifest, icons, images
		 */
		"/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|pompier-sw\\.js|icons).*)",
	],
};
