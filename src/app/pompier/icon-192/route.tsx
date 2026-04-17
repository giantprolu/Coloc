import { ImageResponse } from "next/og";

export async function GET() {
	return new ImageResponse(
		<div
			style={{
				background: "#dc2626",
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: 112,
			}}
		>
			🚒
		</div>,
		{ width: 192, height: 192 },
	);
}
