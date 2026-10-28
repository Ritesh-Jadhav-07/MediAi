
import express from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { 
    bookAppointment,
    getDoctorAppointmentRequests,
    respondToAppointmentRequest,
    getPatientAppointments,
    cancelAppointment,
    updateAppointmentOutcome,
    getDoctorAppointments,
    requestAppointmentReschedule,
    respondToRescheduleRequest,
    getPendingRescheduleRequests,
    requestDoctorReschedule,
    respondToDoctorRescheduleRequest,
    getPendingDoctorRescheduleRequests

 } from "../controllers/appointment.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticateUser,
  authorizeRoles("PATIENT"),
  bookAppointment
);


router.get(
  "/doctor/requests",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  getDoctorAppointmentRequests
);


router.patch(
  "/doctor/requests/:appointmentId/respond",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  respondToAppointmentRequest
);


router.get(
  "/patient/my-appointments",
  authenticateUser,
  authorizeRoles("PATIENT"),
  getPatientAppointments
);


router.patch(
  "/patient/my-appointments/:appointmentId/cancel",
  authenticateUser,
  authorizeRoles("PATIENT"),
  cancelAppointment
);


router.patch(
  "/doctor/requests/:appointmentId/outcome",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  updateAppointmentOutcome
);


router.get(
  "/doctor/my-appointments",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  getDoctorAppointments
);


router.patch(
  "/patient/my-appointments/:appointmentId/reschedule",
  authenticateUser,
  authorizeRoles("PATIENT"),
  requestAppointmentReschedule
);


router.patch(
  "/doctor/requests/:appointmentId/reschedule/respond",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  respondToRescheduleRequest
);


router.get(
  "/doctor/reschedule-requests",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  getPendingRescheduleRequests
);


router.patch(
  "/doctor/my-appointments/:appointmentId/reschedule",
  authenticateUser,
  authorizeRoles("DOCTOR"),
  requestDoctorReschedule
);


router.patch(
  "/patient/my-appointments/:appointmentId/reschedule/respond",
  authenticateUser,
  authorizeRoles("PATIENT"),
  respondToDoctorRescheduleRequest
);


router.get(
  "/patient/reschedule-requests",
  authenticateUser,
  authorizeRoles("PATIENT"),
  getPendingDoctorRescheduleRequests
);

export default router;
