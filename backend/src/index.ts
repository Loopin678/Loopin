import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { initSocket } from "./library/socket";

const port = process.env.PORT || 3000;

const httpServer = createServer(createApp());
initSocket(httpServer);

httpServer.listen(port, () => console.log(`Server on http://localhost:${port}`));
