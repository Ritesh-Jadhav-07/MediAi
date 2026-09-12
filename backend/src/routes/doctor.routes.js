import express from "express";
import { updateDoctorProfile } from "../controllers/doctor.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.patch(
  "/profile",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  updateDoctorProfile
);

export default router;