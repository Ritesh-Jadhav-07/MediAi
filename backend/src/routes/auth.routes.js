import { Router } from "express";
import {
  registerPatient,
  registerDoctor,
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../controllers/auth.controller.js";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {Patient} from "../models/patient.model.js";
import {Doctor} from "../models/doctor.model.js";

import {
  registerPatientSchema,
  registerDoctorSchema,
  
} from "../validators/auth.validator.js";

const router = Router();

router.post(
  "/register/patient",
  validate(registerPatientSchema),
  registerPatient
);

router.post(
  "/register/doctor",
  validate( registerDoctorSchema),
  registerDoctor
);

router.post(
  "/login",
  
  loginUser
);

router.post(
  "/logout",
  authenticateUser,
  logoutUser
);

router.get("/me", authenticateUser, getCurrentUser);

export default router;