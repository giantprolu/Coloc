"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendTestPush } from "@/app/actions/dev";

interface DevToolsProps {
	memberId: string;
}

export function DevTools({ memberId }: DevToolsProps) {
	const [pushLoading, setPushLoading] = useState(false);

	const handleTestPush = async () => {
		setPushLoading(true);
		try {
			await sendTestPush(memberId);
			toast.success("Notification de test envoyée");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setPushLoading(false);
		}
	};

	const handleTestBadge = async (count: number) => {
		if ("setAppBadge" in navigator) {
			if (count > 0) {
				await navigator.setAppBadge?.(count);
				toast.success(`Badge défini à ${count}`);
			} else {
				await navigator.clearAppBadge?.();
				toast.success("Badge effacé");
			}
		} else {
			toast.error("Badging API non supportée sur ce navigateur");
		}
	};

	const handleTestMentionPush = async () => {
		setPushLoading(true);
		try {
			await sendTestPush(memberId, "mention");
			toast.success("Notification mention de test envoyée");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setPushLoading(false);
		}
	};

	const handleTestFireTruck = async () => {
		setPushLoading(true);
		try {
			await sendTestPush(memberId, "firetruck");
			toast.success("🚒 Notification test envoyée");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		} finally {
			setPushLoading(false);
		}
	};

	return (
		<div className="space-y-3">
			<p className="text-xs text-gray-500">
				Outils pour tester les fonctionnalités sans déranger les autres.
			</p>

			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={handleTestPush}
					disabled={pushLoading}
					className="rounded-lg border bg-white p-3 text-left active:bg-gray-50 disabled:opacity-50"
				>
					<p className="text-sm font-medium text-gray-900">🔔 Test Push</p>
					<p className="text-xs text-gray-500">Notif chat</p>
				</button>

				<button
					type="button"
					onClick={handleTestMentionPush}
					disabled={pushLoading}
					className="rounded-lg border bg-white p-3 text-left active:bg-gray-50 disabled:opacity-50"
				>
					<p className="text-sm font-medium text-gray-900">@ Test Mention</p>
					<p className="text-xs text-gray-500">Notif mention</p>
				</button>

				<button
					type="button"
					onClick={handleTestFireTruck}
					disabled={pushLoading}
					className="rounded-lg border bg-white p-3 text-left active:bg-gray-50 disabled:opacity-50"
				>
					<p className="text-sm font-medium text-gray-900">🚒 Test Pompier</p>
					<p className="text-xs text-gray-500">Notif camion</p>
				</button>

				<button
					type="button"
					onClick={() => handleTestBadge(3)}
					className="rounded-lg border bg-white p-3 text-left active:bg-gray-50"
				>
					<p className="text-sm font-medium text-gray-900">🔴 Badge = 3</p>
					<p className="text-xs text-gray-500">Pastille icône</p>
				</button>

				<button
					type="button"
					onClick={() => handleTestBadge(0)}
					className="rounded-lg border bg-white p-3 text-left active:bg-gray-50 col-span-2"
				>
					<p className="text-sm font-medium text-gray-900">✅ Effacer Badge</p>
					<p className="text-xs text-gray-500">
						Retire la pastille de l&apos;icône
					</p>
				</button>
			</div>
		</div>
	);
}
