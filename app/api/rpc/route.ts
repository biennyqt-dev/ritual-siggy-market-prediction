import { NextResponse } from "next/server";

const RPC_URL =
  process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}

