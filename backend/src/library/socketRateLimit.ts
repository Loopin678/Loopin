import { Socket } from "socket.io";

type Rule = { max: number; windowMs: number };

// Limits are per socket (per browser tab) and per event name.
const RULES = new Map<string, Rule>([
  ["send_message", { max: 10, windowMs: 10_000 }], // chat: 10 messages per 10 s
  ["join-project", { max: 20, windowMs: 60_000 }], // joins: 20 per minute
]);
const DEFAULT_RULE: Rule = { max: 60, windowMs: 10_000 }; // every other event
const MAX_DROPPED_BEFORE_DISCONNECT = 100;

type Window = { count: number; resetAt: number };

export function applySocketRateLimit(socket: Socket): void {
  const windows = new Map<string, Window>();
  let dropped = 0;

  socket.use((packet, next) => {
    const [event] = packet;
    const known = RULES.get(event);
    const rule = known ?? DEFAULT_RULE;
    // Unknown event names share one bucket, so a client can't grow this map
    // forever by inventing new event names
    const key = known ? event : "other";
    const now = Date.now();

    let w = windows.get(key);
    if (!w || now >= w.resetAt) {
      w = { count: 0, resetAt: now + rule.windowMs };
      windows.set(key, w);
    }
    w.count += 1;

    if (w.count <= rule.max) {
      next();
      return;
    }

    // Over the limit: drop the event (we never call next) and warn the client once per window
    dropped += 1;
    if (w.count === rule.max + 1) {
      socket.emit("rate_limited", { event: key, retryAfterMs: w.resetAt - now });
    }
    // A client that keeps hammering gets disconnected
    if (dropped >= MAX_DROPPED_BEFORE_DISCONNECT) {
      socket.disconnect(true);
    }
  });
}