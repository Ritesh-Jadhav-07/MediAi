import "dotenv/config";
import { verifyEmailConfiguration } from "./src/utils/emailService.js";

const result = await verifyEmailConfiguration();

if (result.success) {
  console.log("PASS: Gmail SMTP connection verified.");
} else {
  console.error("FAIL:", result.error);
  process.exitCode = 1;
}