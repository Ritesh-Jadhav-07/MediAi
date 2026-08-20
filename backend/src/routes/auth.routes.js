import { Router } from "express";

import {
  registerPatient,
  registerDoctor,
} from "../controllers/auth.controller.js";

import { validate } from "../middlewares/validate.middleware.js";

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
  validate(registerDoctorSchema),
  registerDoctor
);

export default router;