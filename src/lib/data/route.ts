// Shared route helpers. Use when: writing an API route handler under src/app/api.
import { NextResponse } from "next/server";

export const isOffline = (req: Request) => new URL(req.url).searchParams.get("offline") === "1";

export const json = (body: unknown) =>
  NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
