"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
	const router = useRouter();
	const supabase = createClient();

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.push("/login");
	};

	return (
		<Button
			variant="outline"
			className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
			onClick={handleLogout}
		>
			<LogOut className="mr-2 h-4 w-4" />
			Se déconnecter
		</Button>
	);
}
