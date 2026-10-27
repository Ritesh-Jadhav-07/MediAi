import express from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getPendingDoctors,
  getDoctorDetails,
  approveDoctor,
  rejectDoctor,
  getDoctorVerificationHistory,
  getAdminDashboardStats,
  getAllUsers,
  updateUserAccountStatus,
  getAllDoctors,
  updateDoctorVerificationStatus,
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

router.get(
  "/dashboard/stats",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getAdminDashboardStats
);

router.get(
  "/users",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getAllUsers
);

router.patch(
  "/users/:userId/status",
  authenticateUser,
  authorizeRoles("ADMIN"),
  updateUserAccountStatus
);


router.get(
  "/doctors",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getAllDoctors
);


router.patch(
  "/doctors/:doctorId/verification-status",
  authenticateUser,
  authorizeRoles("ADMIN"),
  updateDoctorVerificationStatus
);



export default router;