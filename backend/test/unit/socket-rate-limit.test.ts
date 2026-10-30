import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applySocketRateLimit } from "../../src/library/socketRateLimit";

// A stand-in for a socket.io Socket: just the bits the limiter uses
function fakeSocket() {
  let middleware: (packet: unknown[], next: () => void) => void = () => {};
  const socket = {
    use: (fn: typeof middleware) => { middleware = fn; },
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  applySocketRateLimit(socket as never);
  const send = (event: string) => { let passed = false; middleware([event], () => { passed = true; }); return passed; };
  return { socket, send };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("socket rate limiting", () => {
  it("allows 10 chat messages per 10 s, then drops and warns once", () => {
    const { socket, send } = fakeSocket();
    const results = Array.from({ length: 12 }, () => send("send_message"));
    expect(results.filter(Boolean)).toHaveLength(10);
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith("rate_limited", expect.objectContaining({ event: "send_message" }));
  });

  it("resets after the window", () => {
    const { send } = fakeSocket();
    for (let i = 0; i < 10; i++) send("send_message");
    expect(send("send_message")).toBe(false);
    vi.advanceTimersByTime(10_001);
    expect(send("send_message")).toBe(true);
  });

  it("counts each known event separately", () => {
    const { send } = fakeSocket();
    for (let i = 0; i < 10; i++) send("send_message");
    expect(send("join-project")).toBe(true);
  });

  it("puts unknown event names in one shared bucket", () => {
    const { send } = fakeSocket();
    const results = Array.from({ length: 61 }, (_, i) => send(`made_up_${i}`));
    expect(results.filter(Boolean)).toHaveLength(60);
  });

  it("disconnects a client that keeps hammering", () => {
    const { socket, send } = fakeSocket();
    for (let i = 0; i < 10 + 100; i++) send("send_message");
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
