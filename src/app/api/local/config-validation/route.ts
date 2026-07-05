import { NextResponse, type NextRequest } from "next/server";
import {
  activeSweepstakeConfig,
  getSweepstakeConfigBySlug,
} from "@/data/sweepstakes";
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

  const requestedSlug = request.nextUrl.searchParams.get("slug");
  const config = requestedSlug
    ? getSweepstakeConfigBySlug(requestedSlug)
    : activeSweepstakeConfig;

  if (!config) {
    return NextResponse.json(
      {
        error: `Unknown sweepstake slug: ${requestedSlug}`,
        ok: false,
      },
      { status: 404 },
    );
  }

  const result = validateSweepstakeConfig(config);

  return NextResponse.json({
    ...result,
    sweepstake: {
      id: config.id,
      name: config.name,
      slug: config.slug,
    },
  });
}
