import { type NextRequest } from "next/server";
import { GET as getTheOddsApiOutrights } from "@/app/api/local/the-odds-api-outrights/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getTheOddsApiOutrights(request);
}
