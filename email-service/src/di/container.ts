import nodemailer from "nodemailer";
import { createLogger } from "../logger/index.js";
import { EmailService } from "../services/emailService.js";
import { EmailController } from "../controllers/emailController.js";
import { config } from "../config.js";

class Container {
  private _emailService?: EmailService;
  private _emailController?: EmailController;

  get emailService(): EmailService {
    if (!this._emailService) {
      this._emailService = new EmailService(
        createLogger("EmailService"),
        nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
          },
        }),
      );
    }
    return this._emailService;
  }

  get emailController(): EmailController {
    if (!this._emailController) {
      this._emailController = new EmailController(
        createLogger("EmailController"),
        this.emailService,
      );
    }
    return this._emailController;
  }
}

export const container = new Container();
