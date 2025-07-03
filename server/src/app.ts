import express from "express";
import cors from "cors";
import apiRoutes, { weatherManager } from "./routes/api.js";
import http from "http";
import { setupWebSocket } from "./ws-server.js";
import Scheduler from "./entities/Scheduler.js";
import MailManager from "./entities/MailManager.js";
import SubscriptionDataProvider from "./entities/SubscriptionDataProvider.js";
import { config } from "./config.js";
import { createLogger } from "./logger/index.js";
import nodemailer from "nodemailer";

const PORT = Number(config.PORT) || 3000;
const logger = createLogger("Server");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", apiRoutes);

const server = http.createServer(app);

setupWebSocket(server, weatherManager);

server.listen(PORT, () => {
  logger.info(`Server is running (HTTP + WS) on port ${PORT}`);
});

const scheduler = new Scheduler(createLogger("Scheduler"));
scheduler.start(
  new MailManager(
    nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    }),
    createLogger("MailManager"),
  ),
  SubscriptionDataProvider,
);
