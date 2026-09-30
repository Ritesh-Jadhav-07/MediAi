import express from "express";
import { updateDoctorProfile , getDoctorProfile, createAvailability ,getDoctorAvailability,updateDoctorAvailability , deleteDoctorAvailability} from "../controllers/doctor.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.patch(
  "/profile",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  updateDoctorProfile
);

router.get(
  "/profile",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  getDoctorProfile
);

router.post(
  "/availability",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  createAvailability
);

router.get(
  "/availability",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  getDoctorAvailability
);

router.patch(
  "/availability/:availabilityId",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  updateDoctorAvailability
);

router.delete(
  "/availability/:availabilityId",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  deleteDoctorAvailability
);

export default router;