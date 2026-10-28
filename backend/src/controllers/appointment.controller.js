import mongoose from "mongoose";
import { Appointment } from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDate, durationMinutes = 30, reason } = req.body;

  // Validate required fields.
  if (!doctorId || !appointmentDate || !reason) {
    return res.status(400).json({
      success: false,
      message: "Doctor, appointment date and reason are required",
    });
  }

  // Validate MongoDB ObjectId.
  if (!mongoose.isValidObjectId(doctorId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid doctor ID",
    });
  }

  // Validate appointment duration.
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 240
  ) {
    return res.status(400).json({
      success: false,
      message: "Duration must be a whole number between 5 and 240 minutes",
    });
  }

  // Validate reason.
  if (
    typeof reason !== "string" ||
    reason.trim().length < 3 ||
    reason.trim().length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: "Reason must contain between 3 and 1000 characters",
    });
  }

  // Validate date.
  const startTime = new Date(appointmentDate);

  if (
    typeof appointmentDate !== "string" ||
    Number.isNaN(startTime.getTime()) ||
    startTime <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "Appointment must have a valid future date and time",
    });
  }

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  // Verify the doctor's profile and verification status.
  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  if (doctor.verificationStatus !== "VERIFIED") {
    return res.status(400).json({
      success: false,
      message: "Appointments can only be booked with verified doctors",
    });
  }

  const doctorUser = await User.findById(doctor.userId).select(
    "name email role accountStatus",
  );

  if (
    !doctorUser ||
    doctorUser.role !== "DOCTOR" ||
    doctorUser.accountStatus !== "ACTIVE"
  ) {
    return res.status(400).json({
      success: false,
      message: "Doctor account is not active",
    });
  }

  // Ensure the authenticated user is an active patient.
  const patient = await User.findById(req.user._id).select(
    "role accountStatus",
  );

  if (
    !patient ||
    patient.role !== "PATIENT" ||
    patient.accountStatus !== "ACTIVE"
  ) {
    return res.status(403).json({
      success: false,
      message: "Only active patient accounts can book appointments",
    });
  }

  // Check for overlapping appointments.
  // Cancelled and rejected appointments do not block a time slot.
  const conflictingAppointment = await Appointment.findOne({
    doctorId: doctor._id,
    status: { $nin: ["CANCELLED", "REJECTED"] },
    appointmentDate: { $lt: endTime },
    appointmentEnd: { $gt: startTime },
  }).select("_id");

  if (conflictingAppointment) {
    return res.status(409).json({
      success: false,
      message: "Doctor already has an appointment during this time",
    });
  }

  const appointment = await Appointment.create({
    patientId: patient._id,
    doctorId: doctor._id,
    appointmentDate: startTime,
    appointmentEnd: endTime,
    durationMinutes,
    reason: reason.trim(),
    status: "PENDING",
  });

  return res.status(201).json({
    success: true,
    message: "Appointment booked successfully",
    data: appointment,
  });
});

const getDoctorAppointmentRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "PENDING" } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

  const allowedStatuses = [
    "PENDING",
    "SCHEDULED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment status",
    });
  }

  // Find the authenticated doctor's profile.
  const doctor = await Doctor.findOne({
    userId: req.user._id,
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  const filter = {
    doctorId: doctor._id,
    status,
  };

  const [appointments, totalAppointments] = await Promise.all([
    Appointment.find(filter)
      .populate({
        path: "patientId",
        select: "name email profilePhoto",
      })
      .sort({ appointmentDate: 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Doctor appointments fetched successfully",
    data: appointments,
    pagination: {
      totalAppointments,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalAppointments / pageSize),
      pageSize,
    },
  });
});

const respondToAppointmentRequest = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { action, rejectionReason } = req.body;

  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  if (!["ACCEPT", "REJECT"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be ACCEPT or REJECT",
    });
  }

  if (
    action === "REJECT" &&
    (typeof rejectionReason !== "string" ||
      !rejectionReason.trim() ||
      rejectionReason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "A rejection reason of at most 500 characters is required",
    });
  }

  const doctor = await Doctor.findOne({
    userId: req.user._id,
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  if (doctor.verificationStatus !== "VERIFIED") {
    return res.status(403).json({
      success: false,
      message: "Only verified doctors can manage appointment requests",
    });
  }

  const doctorUser = await User.findById(req.user._id).select("accountStatus");

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Doctor account is not active",
    });
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctor._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment request not found",
    });
  }

  if (appointment.status !== "PENDING") {
    return res.status(400).json({
      success: false,
      message: "Only pending appointment requests can be processed",
    });
  }

  if (appointment.appointmentDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Past appointment requests cannot be accepted or rejected",
    });
  }

  if (action === "ACCEPT") {
    // Recheck the doctor's current eligibility.
    const currentDoctor = await Doctor.findById(doctor._id);

    if (!currentDoctor || currentDoctor.verificationStatus !== "VERIFIED") {
      return res.status(403).json({
        success: false,
        message: "Doctor is no longer verified",
      });
    }

    const conflictingAppointment = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: doctor._id,
      status: { $in: ["SCHEDULED", "CONFIRMED"] },
      appointmentDate: { $lt: appointment.appointmentEnd },
      appointmentEnd: { $gt: appointment.appointmentDate },
    }).select("_id");

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This appointment overlaps with another scheduled appointment",
      });
    }

    appointment.status = "CONFIRMED";
    appointment.rejectionReason = null;
  } else {
    appointment.status = "REJECTED";
    appointment.rejectionReason = rejectionReason.trim();
  }

  await appointment.save();

  return res.status(200).json({
    success: true,
    message:
      action === "ACCEPT"
        ? "Appointment request accepted successfully"
        : "Appointment request rejected successfully",
    data: appointment,
  });
});

const getPatientAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

  const allowedStatuses = [
    "PENDING",
    "SCHEDULED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
  ];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment status",
    });
  }

  const filter = {
    patientId: req.user._id,
  };

  if (status) {
    filter.status = status;
  }

  const [appointments, totalAppointments] = await Promise.all([
    Appointment.find(filter)
      .populate({
        path: "doctorId",
        select:
          "specialization qualification experience verificationStatus userId",
        populate: {
          path: "userId",
          select: "name email profilePhoto",
        },
      })
      .sort({ appointmentDate: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Patient appointments fetched successfully",
    data: appointments,
    pagination: {
      totalAppointments,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalAppointments / pageSize),
      pageSize,
    },
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { cancellationReason } = req.body;

  // Validate appointment ID
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate optional cancellation reason
  if (
    cancellationReason !== undefined &&
    (typeof cancellationReason !== "string" ||
      cancellationReason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Cancellation reason must not exceed 500 characters",
    });
  }

  // Find only an appointment belonging to the logged-in patient
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: req.user._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  // Only pending or confirmed appointments can be cancelled
  const cancellableStatuses = ["PENDING", "CONFIRMED", "SCHEDULED"];

  if (!cancellableStatuses.includes(appointment.status)) {
    return res.status(400).json({
      success: false,
      message: `Appointment cannot be cancelled because its status is ${appointment.status}`,
    });
  }

  // Prevent cancellation after the appointment has started
  if (appointment.appointmentDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "An appointment cannot be cancelled after its start time",
    });
  }

  appointment.status = "CANCELLED";
  appointment.cancellationReason = cancellationReason?.trim() || null;
  appointment.cancelledBy = req.user._id;
  appointment.cancelledAt = new Date();

  await appointment.save();

  return res.status(200).json({
    success: true,
    message: "Appointment cancelled successfully",
    data: appointment,
  });
});

const updateAppointmentOutcome = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { outcome, notes } = req.body;

  // Validate appointment ID
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate requested outcome
  const allowedOutcomes = ["COMPLETED", "NO_SHOW"];

  if (!allowedOutcomes.includes(outcome)) {
    return res.status(400).json({
      success: false,
      message: "Outcome must be COMPLETED or NO_SHOW",
    });
  }

  // Validate optional notes
  if (
    notes !== undefined &&
    (typeof notes !== "string" || notes.trim().length > 2000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Notes must not exceed 2000 characters",
    });
  }

  // Verify the logged-in doctor's profile
  const doctor = await Doctor.findOne({
    userId: req.user._id,
    verificationStatus: "VERIFIED",
  });

  if (!doctor) {
    return res.status(403).json({
      success: false,
      message: "Only verified doctors can update appointment outcomes",
    });
  }

  // Verify doctor account is active
  const doctorUser = await User.findById(req.user._id).select("accountStatus");

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  // Find an appointment belonging to this doctor
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctor._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  // Only confirmed or scheduled appointments can have an outcome
  if (!["CONFIRMED", "SCHEDULED"].includes(appointment.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot update the outcome of an appointment with status ${appointment.status}`,
    });
  }

  // Do not allow an outcome before the appointment ends
  if (appointment.appointmentEnd > new Date()) {
    return res.status(400).json({
      success: false,
      message: "The appointment has not ended yet",
    });
  }

  appointment.status = outcome;
  appointment.completedAt = outcome === "COMPLETED" ? new Date() : null;

  if (notes !== undefined) {
    appointment.notes = notes.trim() || null;
  }

  await appointment.save();

  return res.status(200).json({
    success: true,
    message:
      outcome === "COMPLETED"
        ? "Appointment marked as completed"
        : "Appointment marked as no-show",
    data: appointment,
  });
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);

  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

  const allowedStatuses = [
    "PENDING",
    "SCHEDULED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
  ];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment status",
    });
  }

  // Find the logged-in doctor's profile
  const doctor = await Doctor.findOne({
    userId: req.user._id,
  }).select("_id");

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  const filter = {
    doctorId: doctor._id,
  };

  if (status) {
    filter.status = status;
  }

  const [appointments, totalAppointments] = await Promise.all([
    Appointment.find(filter)
      .populate({
        path: "patientId",
        select: "name email profilePhoto",
      })
      .sort({ appointmentDate: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Doctor appointments fetched successfully",
    data: appointments,
    pagination: {
      totalAppointments,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalAppointments / pageSize),
      pageSize,
    },
  });
});

const requestAppointmentReschedule = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { newAppointmentDate, durationMinutes, reason } = req.body;

  // Validate appointment ID
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate requested date and time
  if (!newAppointmentDate) {
    return res.status(400).json({
      success: false,
      message: "New appointment date and time are required",
    });
  }

  const startTime = new Date(newAppointmentDate);

  if (Number.isNaN(startTime.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment date and time",
    });
  }

  if (startTime <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "New appointment time must be in the future",
    });
  }

  // Validate duration
  const duration = durationMinutes === undefined ? 30 : Number(durationMinutes);

  if (!Number.isInteger(duration) || duration < 5 || duration > 240) {
    return res.status(400).json({
      success: false,
      message: "Duration must be a whole number between 5 and 240 minutes",
    });
  }

  // Validate optional reason
  if (
    reason !== undefined &&
    (typeof reason !== "string" || reason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Rescheduling reason must not exceed 500 characters",
    });
  }

  // Find only an appointment belonging to the logged-in patient
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: req.user._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  // Rescheduling is allowed only for future confirmed appointments
  if (
    !["CONFIRMED", "SCHEDULED"].includes(appointment.status) ||
    appointment.appointmentDate <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "Only future confirmed appointments can be rescheduled",
    });
  }

  // Do not allow multiple pending reschedule requests
  if (appointment.rescheduleRequest?.status === "PENDING") {
    return res.status(409).json({
      success: false,
      message: "A rescheduling request is already pending",
    });
  }

  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  // Ensure the doctor has no overlapping confirmed appointment
  const conflictingAppointment = await Appointment.findOne({
    _id: { $ne: appointment._id },
    doctorId: appointment.doctorId,
    status: { $in: ["CONFIRMED", "SCHEDULED"] },
    appointmentDate: { $lt: endTime },
    appointmentEnd: { $gt: startTime },
  }).select("_id");

  if (conflictingAppointment) {
    return res.status(409).json({
      success: false,
      message:
        "The doctor already has an appointment during the requested time",
    });
  }

  // Store the proposed time without changing the original appointment

  appointment.rescheduleRequest = {
    requestedDate: startTime,
    requestedEnd: endTime,
    requestedDurationMinutes: duration,
    reason: reason?.trim() || null,
    status: "PENDING",
    requestedBy: req.user._id,
    requestedByRole: "PATIENT",
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    reviewedByRole: null,
    rejectionReason: null,
  };

  await appointment.save();

  return res.status(200).json({
    success: true,
    message: "Rescheduling request submitted successfully",
    data: appointment,
  });
});


const respondToRescheduleRequest = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { action, rejectionReason } = req.body;

  // Validate appointment ID
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate action
  if (!["ACCEPT", "REJECT"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be ACCEPT or REJECT",
    });
  }

  // Validate rejection reason
  if (
    action === "REJECT" &&
    (typeof rejectionReason !== "string" ||
      !rejectionReason.trim() ||
      rejectionReason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "A rejection reason of at most 500 characters is required",
    });
  }

  // Verify the logged-in doctor
  const doctor = await Doctor.findOne({
    userId: req.user._id,
    verificationStatus: "VERIFIED",
  });

  if (!doctor) {
    return res.status(403).json({
      success: false,
      message: "Only verified doctors can review rescheduling requests",
    });
  }

  // Verify doctor account is active
  const doctorUser = await User.findById(req.user._id).select(
    "accountStatus"
  );

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  // Ensure the appointment belongs to this doctor
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctor._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  // The original appointment must still be active and in the future
  if (
    !["CONFIRMED", "SCHEDULED"].includes(appointment.status) ||
    appointment.appointmentDate <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "This appointment is no longer eligible for rescheduling",
    });
  }

  const request = appointment.rescheduleRequest;

  // Verify a pending request exists
  if (!request || request.status !== "PENDING") {
    return res.status(400).json({
      success: false,
      message: "No pending rescheduling request exists",
    });
  }

  // Doctors may respond only to patient-initiated requests.
  // A null role is allowed for backward compatibility with older requests.
  if (request.requestedByRole === "DOCTOR") {
    return res.status(400).json({
      success: false,
      message: "You cannot respond to your own reschedule request",
    });
  }

  // Validate proposed appointment time
  if (
    !request.requestedDate ||
    !request.requestedEnd ||
    request.requestedDate <= new Date() ||
    request.requestedEnd <= request.requestedDate
  ) {
    return res.status(400).json({
      success: false,
      message: "The requested appointment time is no longer valid",
    });
  }

  if (action === "ACCEPT") {
    // Recheck scheduling conflicts before accepting
    const conflictingAppointment = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: doctor._id,
      status: { $in: ["CONFIRMED", "SCHEDULED"] },
      appointmentDate: { $lt: request.requestedEnd },
      appointmentEnd: { $gt: request.requestedDate },
    }).select("_id");

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: "The requested time is no longer available",
      });
    }

    // Apply the proposed appointment time
    appointment.appointmentDate = request.requestedDate;
    appointment.appointmentEnd = request.requestedEnd;
    appointment.durationMinutes = request.requestedDurationMinutes;

    request.status = "ACCEPTED";
    request.rejectionReason = null;
  } else {
    // Preserve the original appointment time
    request.status = "REJECTED";
    request.rejectionReason = rejectionReason.trim();
  }

  // Record who reviewed the request
  request.reviewedAt = new Date();
  request.reviewedBy = req.user._id;
  request.reviewedByRole = "DOCTOR";

  await appointment.save();

  return res.status(200).json({
    success: true,
    message:
      action === "ACCEPT"
        ? "Rescheduling request accepted successfully"
        : "Rescheduling request rejected successfully",
    data: appointment,
  });
});


const requestDoctorReschedule = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { newAppointmentDate, durationMinutes, reason } = req.body;

  // Validate appointment ID
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate proposed date
  const startTime = new Date(newAppointmentDate);

  if (
    !newAppointmentDate ||
    Number.isNaN(startTime.getTime()) ||
    startTime <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid future appointment date is required",
    });
  }

  // Verify doctor is verified
  const doctor = await Doctor.findOne({
    userId: req.user._id,
    verificationStatus: "VERIFIED",
  });

  if (!doctor) {
    return res.status(403).json({
      success: false,
      message: "Only verified doctors can request rescheduling",
    });
  }

  // Verify doctor account is active
  const doctorUser = await User.findById(req.user._id).select(
    "accountStatus"
  );

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  // Find appointment belonging to this doctor
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctor._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  // Original appointment must be active and in the future
  if (
    !["CONFIRMED", "SCHEDULED"].includes(appointment.status) ||
    appointment.appointmentDate <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "This appointment is no longer eligible for rescheduling",
    });
  }

  // Do not allow multiple pending requests
  if (appointment.rescheduleRequest?.status === "PENDING") {
    return res.status(409).json({
      success: false,
      message: "A rescheduling request is already pending",
    });
  }

  // Use existing appointment duration unless a new duration is supplied
  const duration =
    durationMinutes === undefined
      ? appointment.durationMinutes
      : Number(durationMinutes);

  if (
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 240
  ) {
    return res.status(400).json({
      success: false,
      message: "Duration must be an integer between 5 and 240 minutes",
    });
  }

  // Validate reason
  if (
    reason !== undefined &&
    (typeof reason !== "string" || reason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Reason must be a string of at most 500 characters",
    });
  }

  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  // Check for conflicts with other confirmed/scheduled appointments
  const conflictingAppointment = await Appointment.findOne({
    _id: { $ne: appointment._id },
    doctorId: doctor._id,
    status: { $in: ["CONFIRMED", "SCHEDULED"] },
    appointmentDate: { $lt: endTime },
    appointmentEnd: { $gt: startTime },
  }).select("_id");

  if (conflictingAppointment) {
    return res.status(409).json({
      success: false,
      message: "The requested time conflicts with another appointment",
    });
  }

  // Create a doctor-initiated reschedule request
  appointment.rescheduleRequest = {
    requestedDate: startTime,
    requestedEnd: endTime,
    requestedDurationMinutes: duration,
    reason: reason?.trim() || null,
    status: "PENDING",
    requestedBy: req.user._id,
    requestedByRole: "DOCTOR",
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    reviewedByRole: null,
    rejectionReason: null,
  };

  await appointment.save();

  return res.status(200).json({
    success: true,
    message: "Rescheduling request sent to the patient successfully",
    data: appointment,
  });
});



const getPendingRescheduleRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  // Find the logged-in doctor's profile
  const doctor = await Doctor.findOne({
    userId: req.user._id,
    verificationStatus: "VERIFIED",
  }).select("_id");

  if (!doctor) {
    return res.status(403).json({
      success: false,
      message: "Only verified doctors can view rescheduling requests",
    });
  }

  // Verify doctor account is active
  const doctorUser = await User.findById(req.user._id).select(
    "accountStatus"
  );

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  // Only show pending requests initiated by patients
  const filter = {
    doctorId: doctor._id,
    status: { $in: ["CONFIRMED", "SCHEDULED"] },
    "rescheduleRequest.status": "PENDING",
    "rescheduleRequest.requestedByRole": "PATIENT",
  };

  const [appointments, totalRequests] = await Promise.all([
    Appointment.find(filter)
      .populate({
        path: "patientId",
        select: "name email profilePhoto",
      })
      .sort({ "rescheduleRequest.requestedAt": 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Pending patient rescheduling requests fetched successfully",
    data: appointments,
    pagination: {
      totalRequests,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalRequests / pageSize),
      pageSize,
    },
  });
});


const respondToDoctorRescheduleRequest = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { action, rejectionReason } = req.body;

  // Validate appointment ID
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate action
  if (!["ACCEPT", "REJECT"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be ACCEPT or REJECT",
    });
  }

  // Validate rejection reason
  if (
    action === "REJECT" &&
    (typeof rejectionReason !== "string" ||
      !rejectionReason.trim() ||
      rejectionReason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "A rejection reason of at most 500 characters is required",
    });
  }

  // Verify patient account is active
  const patient = await User.findOne({
    _id: req.user._id,
    role: "PATIENT",
    accountStatus: "ACTIVE",
  }).select("_id");

  if (!patient) {
    return res.status(403).json({
      success: false,
      message: "Only active patient accounts can respond to this request",
    });
  }

  // Ensure the appointment belongs to this patient
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patientId: patient._id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found",
    });
  }

  // Original appointment must still be active and in the future
  if (
    !["CONFIRMED", "SCHEDULED"].includes(appointment.status) ||
    appointment.appointmentDate <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "This appointment is no longer eligible for rescheduling",
    });
  }

  const request = appointment.rescheduleRequest;

  // Verify pending request was initiated by the doctor
  if (
    !request ||
    request.status !== "PENDING" ||
    request.requestedByRole !== "DOCTOR"
  ) {
    return res.status(400).json({
      success: false,
      message: "No pending doctor-initiated rescheduling request exists",
    });
  }

  // Validate the proposed time
  if (
    !request.requestedDate ||
    !request.requestedEnd ||
    request.requestedDate <= new Date() ||
    request.requestedEnd <= request.requestedDate
  ) {
    return res.status(400).json({
      success: false,
      message: "The requested appointment time is no longer valid",
    });
  }

  if (action === "ACCEPT") {
    // Recheck for scheduling conflicts before accepting
    const conflictingAppointment = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: appointment.doctorId,
      status: { $in: ["CONFIRMED", "SCHEDULED"] },
      appointmentDate: { $lt: request.requestedEnd },
      appointmentEnd: { $gt: request.requestedDate },
    }).select("_id");

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: "The requested time is no longer available",
      });
    }

    // Apply the proposed appointment time
    appointment.appointmentDate = request.requestedDate;
    appointment.appointmentEnd = request.requestedEnd;
    appointment.durationMinutes = request.requestedDurationMinutes;

    request.status = "ACCEPTED";
    request.rejectionReason = null;
  } else {
    // Keep the original appointment time
    request.status = "REJECTED";
    request.rejectionReason = rejectionReason.trim();
  }

  // Record the patient's response
  request.reviewedAt = new Date();
  request.reviewedBy = patient._id;
  request.reviewedByRole = "PATIENT";

  await appointment.save();

  return res.status(200).json({
    success: true,
    message:
      action === "ACCEPT"
        ? "Doctor's rescheduling request accepted successfully"
        : "Doctor's rescheduling request rejected successfully",
    data: appointment,
  });
});


const getPendingDoctorRescheduleRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  // Verify patient account is active
  const patient = await User.findOne({
    _id: req.user._id,
    role: "PATIENT",
    accountStatus: "ACTIVE",
  }).select("_id");

  if (!patient) {
    return res.status(403).json({
      success: false,
      message: "Only active patient accounts can view these requests",
    });
  }

  // Find pending doctor-initiated requests for this patient
  const filter = {
    patientId: patient._id,
    status: { $in: ["CONFIRMED", "SCHEDULED"] },
    "rescheduleRequest.status": "PENDING",
    "rescheduleRequest.requestedByRole": "DOCTOR",
  };

  const [appointments, totalRequests] = await Promise.all([
    Appointment.find(filter)
      .populate({
        path: "doctorId",
        select: "specialization qualification experience userId",
        populate: {
          path: "userId",
          select: "name email profilePhoto",
        },
      })
      .sort({ "rescheduleRequest.requestedAt": 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Appointment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Pending doctor rescheduling requests fetched successfully",
    data: appointments,
    pagination: {
      totalRequests,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalRequests / pageSize),
      pageSize,
    },
  });
});


export {
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
    getPendingDoctorRescheduleRequests,
};
