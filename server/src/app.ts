import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
import http from "http";
import { setupWebSocket } from "./ws-server.js";
import Scheduler from "./managers/Scheduler.js";
import GmailMailer from "./managers/GmailMailer.js";
import DbDataProvider from "./managers/DbDataProvider.js";

const PORT: number = Number(process.env.PORT) || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", apiRoutes);

const server: http.Server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running (HTTP + WS) on port ${PORT}`);
});

Scheduler.start(new GmailMailer(), DbDataProvider);
