import express from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getPendingDoctors,
  getDoctorDetails,
  approveDoctor,
  rejectDoctor,
  getDoctorVerificationHistory,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.get(
  "/doctors/pending",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getPendingDoctors
);

router.get(
  "/doctors/:doctorId",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getDoctorDetails
);

router.patch(
  "/doctors/:doctorId/approve",
  authenticateUser,
  authorizeRoles("ADMIN"),
  approveDoctor
);

router.patch(
  "/doctors/:doctorId/reject",
  authenticateUser,
  authorizeRoles("ADMIN"),
  rejectDoctor
);

router.get(
  "/doctors/:doctorId/verification-history",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getDoctorVerificationHistory
);


export default router;