/**
 * SSE (Server-Sent Events) endpoint for real-time payment event streaming.
 *
 * GET /api/events — subscribe to live payment events
 *
 * Events emitted:
 * - payment:created — new payment workflow created
 * - payment:submitted — transaction submitted to Stellar
 * - payment:completed — transaction confirmed on-chain
 * - payment:failed — transaction failed
 * - heartbeat — keep-alive ping every 15 seconds
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
        );
      }, 15000);

      // Simulate a payment event on connection (demo purposes)
      const simulateEvent = (eventType: string, delay: number) => {
        setTimeout(() => {
          if (closed) return;
          const payload = {
            event: eventType,
            timestamp: new Date().toISOString(),
            paymentId: `pay_${Date.now().toString(36)}`,
            status: eventType === "payment:completed"
              ? "COMPLETED"
              : eventType === "payment:failed"
                ? "FAILED"
                : "PROCESSING",
          };
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        }, delay);
      };

      // Initial connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: "SSE stream connected" })}\n\n`)
      );

      // Demo events
      simulateEvent("payment:created", 2000);
      simulateEvent("payment:submitted", 5000);
      simulateEvent("payment:completed", 10000);

      // Cleanup
      return () => {
        closed = true;
        clearInterval(heartbeat);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
