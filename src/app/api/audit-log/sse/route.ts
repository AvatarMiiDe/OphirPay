import { NextResponse } from "next/server";

/** Map of connected SSE clients: clientId → controller */
const clients = new Map<string, ReadableStreamDefaultController>();

let clientCounter = 0;

/** Broadcast an audit event to ALL connected clients */
export function broadcastAuditEvent(event: {
  id: number;
  timestamp: number;
  action: string;
  actor: string;
  target_id: number;
  details: string;
}) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  // Use TextEncoder for proper encoding
  const encoder = new TextEncoder();
  clients.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(data));
    } catch {
      clients.delete(Array.from(clients.entries()).find(([, v]) => v === controller)?.[0] ?? "");
    }
  });
}

export async function GET() {
  const clientId = ++clientCounter;

  const stream = new ReadableStream({
    start(controller) {
      clients.set(String(clientId), controller);

      // Send initial connected event
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(
        `event: connected\ndata: ${JSON.stringify({ clientId, message: "Audit log SSE stream connected" })}\n\n`
      ));

      // Send a sample audit entry every 30 seconds for demo
      const interval = setInterval(() => {
        const demoEvent = {
          id: Date.now(),
          timestamp: Math.floor(Date.now() / 1000),
          action: "payment_recorded",
          actor: "GDEMO...",
          target_id: Math.floor(Math.random() * 1000),
          details: `Demo audit entry at ${new Date().toISOString()}`,
        };
        broadcastAuditEvent(demoEvent);
      }, 30_000);

      // Cleanup on disconnect
      const cleanup = () => {
        clearInterval(interval);
        clients.delete(String(clientId));
      };

      // Detect client disconnect via abort signal
      if (controller.signal) {
        controller.signal.addEventListener("abort", cleanup);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
