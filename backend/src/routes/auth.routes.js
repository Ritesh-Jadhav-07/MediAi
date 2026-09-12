import { Router } from "express";
import {
  registerPatient,
  registerDoctor,
  loginUser,
  getCurrentUser
} from "../controllers/auth.controller.js";

import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register/patient", registerPatient);
router.post("/register/doctor", registerDoctor);

router.post("/login", loginUser);

router.get("/me", authenticateUser, getCurrentUser);

export default router;