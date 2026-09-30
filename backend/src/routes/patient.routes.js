import { Router } from "express";

import { getPatientProfile, updatePatientProfile, getVerifiedDoctors } from "../controllers/patient.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.get(
  "/profile",
  authenticateUser,
  authorizeRoles("PATIENT"),
  getPatientProfile
);


router.patch(
  "/profile",
  authenticateUser,
  authorizeRoles("PATIENT"),
  updatePatientProfile
);

router.get(
  "/doctors",
  authenticateUser,
  authorizeRoles("PATIENT"),
  getVerifiedDoctors
);

export default router;