import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/http";
import { visitorPhoneCountry } from "@/lib/visitor-country";

export async function GET(req: NextRequest) {
  const country = await visitorPhoneCountry(clientIp(req));
  return NextResponse.json({ country }, { headers: { "Cache-Control": "private, max-age=900", "Vary": "X-Real-IP" } });
}
