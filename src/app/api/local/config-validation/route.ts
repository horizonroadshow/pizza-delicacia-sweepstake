import { NextResponse, type NextRequest } from "next/server";
import { activeSweepstakeConfig } from "@/data/sweepstakes";
import { validateSweepstakeConfig } from "@/data/sweepstakes/validation";

export const dynamic = "force-dynamic";

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        error: "Config validation is local-only.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const result = validateSweepstakeConfig(activeSweepstakeConfig);

  return NextResponse.json({
    ...result,
    sweepstake: {
      id: activeSweepstakeConfig.id,
      name: activeSweepstakeConfig.name,
      slug: activeSweepstakeConfig.slug,
    },
  });
}
