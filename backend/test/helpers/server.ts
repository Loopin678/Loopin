import { createServer, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../../src/app";
import { initSocket } from "../../src/library/socket";

export type TestServer = { http: Server; url: string; close: () => Promise<void> };

// Real HTTP + Socket.IO server on a random port. Controllers emit socket events
// (getIO()), so the socket layer must exist even for plain HTTP tests.
export async function startServer(): Promise<TestServer> {
  const http = createServer(createApp());
  const io = initSocket(http);
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const { port } = http.address() as AddressInfo;
  return {
    http,
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      io.close();
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
