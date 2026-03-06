"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "password-banner-dismissed";

interface PasswordBannerProps {
	passwordInitialized?: boolean;
}

export function PasswordBanner({ passwordInitialized }: PasswordBannerProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		// Si le mot de passe est déjà défini, ne jamais afficher
		if (passwordInitialized) {
			localStorage.removeItem(DISMISSED_KEY);
			return;
		}
		const dismissed = localStorage.getItem(DISMISSED_KEY);
		if (!dismissed) {
			setVisible(true);
		}
	}, [passwordInitialized]);

	const dismiss = () => {
		localStorage.setItem(DISMISSED_KEY, "1");
		setVisible(false);
	};

	if (!visible) return null;

	return (
		<div className="mx-4 mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-3">
			<div className="flex-1 text-sm text-amber-800">
				<p className="font-medium">Définissez votre mot de passe</p>
				<p className="text-amber-600 text-xs mt-0.5">
					La connexion par lien magique a été désactivée.{" "}
					<Link
						href="/settings"
						className="underline font-medium text-amber-800"
					>
						Définir un mot de passe
					</Link>{" "}
					pour continuer à accéder à votre compte.
				</p>
			</div>
			<button
				onClick={dismiss}
				className="text-amber-400 hover:text-amber-600 shrink-0"
				aria-label="Fermer"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
