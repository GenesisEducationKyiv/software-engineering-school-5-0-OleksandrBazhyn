import express from "express";
import type SubscriptionController from "../controllers/SubscriptionController.js";

export function createSubscriptionRoutes(
  subscriptionController: SubscriptionController,
): express.Router {
  const router = express.Router();

  // POST /api/v1/subscribe
  router.post("/subscribe", (req, res) => subscriptionController.subscribe(req, res));

  // GET /api/v1/confirm/:token
  router.get("/confirm/:token", (req, res) => subscriptionController.confirm(req, res));

  // GET /api/v1/unsubscribe/:token
  router.get("/unsubscribe/:token", (req, res) => subscriptionController.unsubscribe(req, res));

  // GET /api/v1/health
  router.get("/health", (req, res) => subscriptionController.health(req, res));

  return router;
}

export default createSubscriptionRoutes;
