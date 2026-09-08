import { NextResponse } from "next/server";
import type { ConversionEvent } from "@/lib/events";

/**
 * Stand-in for a real server-side conversion send (e.g. to an ads platform's
 * conversion API). For now it just logs whatever event the client posted —
 * this is what lets a later dedup check compare a browser-logged event
 * against its server-logged counterpart by `event_id`.
 */
export async function POST(request: Request) {
  let event: ConversionEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!event?.event_id || !event?.type) {
    return NextResponse.json(
      { error: "Event must include event_id and type" },
      { status: 400 },
    );
  }

  console.log("[server] conversion event received:", event);

  return NextResponse.json({ event_id: event.event_id });
}
