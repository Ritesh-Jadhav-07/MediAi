import mongoose from "mongoose";
import { Appointment } from "../models/appointment.model.js";
import { Doctor } from "../models/doctor.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppointmentSlot } from "../models/appointmentSlot.model.js";
import { generateAppointmentSlots } from "../utils/appointmentSlot.js";
import { sendEmail } from "../utils/emailService.js";

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
    durationMinutes > 240 ||
    durationMinutes % 5 !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Duration must be a multiple of five between 5 and 240 minutes",
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

  // Validate appointment date.
  if (typeof appointmentDate !== "string") {
    return res.status(400).json({
      success: false,
      message: "Appointment must have a valid future date and time",
    });
  }

  const startTime = new Date(appointmentDate);

  if (Number.isNaN(startTime.getTime()) || startTime <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Appointment must have a valid future date and time",
    });
  }

  // Require the start time to align to a five-minute boundary.
  const SLOT_DURATION_MS = 5 * 60 * 1000;

  if (startTime.getTime() % SLOT_DURATION_MS !== 0) {
    return res.status(400).json({
      success: false,
      message: "Appointment start time must align to a five-minute interval",
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

  // Create a pending request. Slots are reserved when the doctor accepts.
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
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Recheck that this request is still pending.
        const currentAppointment = await Appointment.findOne({
          _id: appointmentId,
          doctorId: doctor._id,
          status: "PENDING",
        }).session(session);

        if (!currentAppointment) {
          const error = new Error("Appointment request is no longer pending");
          error.statusCode = 409;
          throw error;
        }

        // Recheck the doctor's eligibility.
        const currentDoctor = await Doctor.findById(doctor._id).session(
          session,
        );

        if (!currentDoctor || currentDoctor.verificationStatus !== "VERIFIED") {
          const error = new Error("Doctor is no longer verified");
          error.statusCode = 403;
          throw error;
        }

        const currentDoctorUser = await User.findById(req.user._id)
          .select("accountStatus")
          .session(session);

        if (
          !currentDoctorUser ||
          currentDoctorUser.accountStatus !== "ACTIVE"
        ) {
          const error = new Error("Doctor account is not active");
          error.statusCode = 403;
          throw error;
        }

        // Generate five-minute slots for the appointment.
        const slots = generateAppointmentSlots(
          currentAppointment.appointmentDate,
          currentAppointment.appointmentEnd,
        );

        // Reserve all slots. The unique index prevents two
        // appointments from reserving the same doctor's time.
        await AppointmentSlot.insertMany(
          slots.map((slotStart) => ({
            doctorId: doctor._id,
            appointmentId: currentAppointment._id,
            slotStart,
          })),
          {
            session,
            ordered: true,
          },
        );

        // Confirm the appointment in the same transaction.
        currentAppointment.status = "CONFIRMED";
        currentAppointment.rejectionReason = null;

        await currentAppointment.save({ session });

        // Preserve the confirmed document for the response.
        Object.assign(appointment, currentAppointment.toObject());
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "This time slot is already reserved. Please choose another appointment time.",
        });
      }

      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    } finally {
      await session.endSession();
    }
  } else {
    // Reject the pending appointment.
    appointment.status = "REJECTED";
    appointment.rejectionReason = rejectionReason.trim();

    await appointment.save();
  }

  // Send an email to the patient after the appointment status is saved.
  try {
    const patient = await User.findById(appointment.patientId).select(
      "name email",
    );

    if (patient?.email) {
      const isAccepted = action === "ACCEPT";
      const appointmentDate = new Date(
        appointment.appointmentDate,
      ).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      await sendEmail({
        to: patient.email,
        subject: isAccepted
          ? "MediAI: Appointment Accepted"
          : "MediAI: Appointment Rejected",
        text: [
          `Hello ${patient.name || "Patient"},`,
          "",
          isAccepted
            ? "Your appointment request has been accepted by the doctor."
            : "Your appointment request has been rejected by the doctor.",
          "",
          `Appointment date and time: ${appointmentDate} (IST)`,
          "",
          "Please log in to MediAI to view your appointment details.",
          "",
          "Regards,",
          "MediAI Team",
        ].join("\n"),
      });
    } else {
      console.warn(
        "Appointment email skipped: patient email address not found.",
      );
    }
  } catch (error) {
    // Email-related failures must not change the successful API response.
    console.error("Failed to process appointment status email:", error.message);
  }

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

  // Validate appointment ID.
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate optional cancellation reason.
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

  // Find an appointment belonging to the logged-in patient.
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

  // Only pending or confirmed appointments can be cancelled.
  const cancellableStatuses = ["PENDING", "CONFIRMED", "SCHEDULED"];

  if (!cancellableStatuses.includes(appointment.status)) {
    return res.status(400).json({
      success: false,
      message: `Appointment cannot be cancelled because its status is ${appointment.status}`,
    });
  }

  // Prevent cancellation after the appointment has started.
  if (appointment.appointmentDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "An appointment cannot be cancelled after its start time",
    });
  }

  const session = await mongoose.startSession();

  try {
    let cancelledAppointment;

    await session.withTransaction(async () => {
      // Recheck ownership and status inside the transaction.
      const currentAppointment = await Appointment.findOne({
        _id: appointmentId,
        patientId: req.user._id,
        status: { $in: cancellableStatuses },
        appointmentDate: { $gt: new Date() },
      }).session(session);

      if (!currentAppointment) {
        const error = new Error(
          "Appointment is no longer eligible for cancellation",
        );
        error.statusCode = 409;
        throw error;
      }

      // Release any reserved slots belonging to this appointment.
      await AppointmentSlot.deleteMany(
        {
          appointmentId: currentAppointment._id,
        },
        { session },
      );

      // Cancel the appointment.
      currentAppointment.status = "CANCELLED";
      currentAppointment.cancellationReason =
        cancellationReason?.trim() || null;
      currentAppointment.cancelledBy = req.user._id;
      currentAppointment.cancelledAt = new Date();

      await currentAppointment.save({ session });

      cancelledAppointment = currentAppointment.toObject();
    });

    // Notify the doctor after the cancellation transaction commits.
    try {
      const doctor = await User.findById(cancelledAppointment.doctorId).select(
        "name email",
      );

      if (doctor?.email) {
        const appointmentDate = new Date(
          cancelledAppointment.appointmentDate,
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });

        await sendEmail({
          to: doctor.email,
          subject: "MediAI: Appointment Cancelled",
          text: [
            `Hello Dr. ${doctor.name || ""},`,
            "",
            "A patient has cancelled an appointment.",
            "",
            `Appointment date and time: ${appointmentDate} (IST)`,
            cancelledAppointment.cancellationReason
              ? `Cancellation reason: ${cancelledAppointment.cancellationReason}`
              : "No cancellation reason was provided.",
            "",
            "Please log in to MediAI to view your appointment details.",
            "",
            "Regards,",
            "MediAI Team",
          ].join("\n"),
        });
      } else {
        console.warn(
          "Cancellation email skipped: doctor email address not found.",
        );
      }
    } catch (error) {
      console.error(
        "Failed to send appointment cancellation email:",
        error.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: cancelledAppointment,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  } finally {
    await session.endSession();
  }
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

  // Validate appointment ID.
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate requested date and time.
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

  // Require the start time to align to a five-minute boundary.
  const SLOT_DURATION_MS = 5 * 60 * 1000;

  if (startTime.getTime() % SLOT_DURATION_MS !== 0) {
    return res.status(400).json({
      success: false,
      message: "Appointment start time must align to a five-minute interval",
    });
  }

  // Validate duration.
  const duration = durationMinutes === undefined ? 30 : Number(durationMinutes);

  if (
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 240 ||
    duration % 5 !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Duration must be a multiple of five between 5 and 240 minutes",
    });
  }

  // Validate optional reason.
  if (
    reason !== undefined &&
    (typeof reason !== "string" || reason.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Rescheduling reason must not exceed 500 characters",
    });
  }

  // Find an appointment belonging to the logged-in patient.
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

  // Only future confirmed appointments can be rescheduled.
  if (
    !["CONFIRMED", "SCHEDULED"].includes(appointment.status) ||
    appointment.appointmentDate <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "Only future confirmed appointments can be rescheduled",
    });
  }

  // Do not allow multiple pending reschedule requests.
  if (appointment.rescheduleRequest?.status === "PENDING") {
    return res.status(409).json({
      success: false,
      message: "A rescheduling request is already pending",
    });
  }

  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  // Check for overlapping confirmed appointments.
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

  // Store the proposed time without changing the original appointment.
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

  // Notify the doctor after the rescheduling request is saved.
  try {
    const doctorProfile = await Doctor.findById(appointment.doctorId).select(
      "userId",
    );

    const doctorUser = doctorProfile
      ? await User.findById(doctorProfile.userId).select("name email")
      : null;

    if (doctorUser?.email) {
      const formatDate = (date) =>
        new Date(date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });

      await sendEmail({
        to: doctorUser.email,
        subject: "MediAI: Appointment Rescheduling Request",
        text: [
          `Hello Dr. ${doctorUser.name || ""},`,
          "",
          "A patient has requested to reschedule an appointment.",
          "",
          `Current appointment time: ${formatDate(appointment.appointmentDate)} (IST)`,
          `Requested new time: ${formatDate(appointment.rescheduleRequest.requestedDate)} (IST)`,
          `Reason: ${appointment.rescheduleRequest.reason || "Not provided"}`,
          "",
          "Please log in to MediAI to review the request.",
          "",
          "Regards,",
          "MediAI Team",
        ].join("\n"),
      });
    } else {
      console.warn(
        "Rescheduling email skipped: doctor email address not found.",
      );
    }
  } catch (error) {
    console.error("Failed to send rescheduling request email:", error.message);
  }

  return res.status(200).json({
    success: true,
    message: "Rescheduling request submitted successfully",
    data: appointment,
  });
});

const respondToRescheduleRequest = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { action, rejectionReason } = req.body;

  // Validate appointment ID.
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate action.
  if (!["ACCEPT", "REJECT"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be ACCEPT or REJECT",
    });
  }

  // Validate rejection reason.
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

  // Verify the logged-in doctor.
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

  // Verify doctor account is active.
  const doctorUser = await User.findById(req.user._id).select("accountStatus");

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  // Ensure the appointment belongs to this doctor.
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

  // The original appointment must still be active and in the future.
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

  // Verify a pending request exists.
  if (!request || request.status !== "PENDING") {
    return res.status(400).json({
      success: false,
      message: "No pending rescheduling request exists",
    });
  }

  // Doctors may respond only to patient-initiated requests.
  if (request.requestedByRole === "DOCTOR") {
    return res.status(400).json({
      success: false,
      message: "You cannot respond to your own reschedule request",
    });
  }

  // Validate the proposed appointment time.
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
    const session = await mongoose.startSession();

    try {
      let updatedAppointment;

      await session.withTransaction(async () => {
        // Re-read the appointment and pending request inside the transaction.
        const currentAppointment = await Appointment.findOne({
          _id: appointmentId,
          doctorId: doctor._id,
          status: { $in: ["CONFIRMED", "SCHEDULED"] },
          "rescheduleRequest.status": "PENDING",
          "rescheduleRequest.requestedByRole": { $ne: "DOCTOR" },
          appointmentDate: { $gt: new Date() },
        }).session(session);

        if (!currentAppointment) {
          const error = new Error(
            "Appointment or rescheduling request is no longer eligible",
          );
          error.statusCode = 409;
          throw error;
        }

        const currentRequest = currentAppointment.rescheduleRequest;

        if (
          !currentRequest.requestedDate ||
          !currentRequest.requestedEnd ||
          currentRequest.requestedDate <= new Date() ||
          currentRequest.requestedEnd <= currentRequest.requestedDate
        ) {
          const error = new Error(
            "The requested appointment time is no longer valid",
          );
          error.statusCode = 400;
          throw error;
        }

        // Recheck for overlapping confirmed appointments.
        const conflictingAppointment = await Appointment.findOne({
          _id: { $ne: currentAppointment._id },
          doctorId: doctor._id,
          status: { $in: ["CONFIRMED", "SCHEDULED"] },
          appointmentDate: { $lt: currentRequest.requestedEnd },
          appointmentEnd: { $gt: currentRequest.requestedDate },
        })
          .select("_id")
          .session(session);

        if (conflictingAppointment) {
          const error = new Error("The requested time is no longer available");
          error.statusCode = 409;
          throw error;
        }

        // Generate slots before modifying the existing reservations.
        const newSlots = generateAppointmentSlots(
          currentRequest.requestedDate,
          currentRequest.requestedEnd,
        );

        // Remove the old reservations.
        await AppointmentSlot.deleteMany(
          { appointmentId: currentAppointment._id },
          { session },
        );

        // Reserve the new slots. The unique index prevents collisions.
        await AppointmentSlot.insertMany(
          newSlots.map((slotStart) => ({
            doctorId: doctor._id,
            appointmentId: currentAppointment._id,
            slotStart,
          })),
          { session, ordered: true },
        );

        // Update the appointment's scheduled time.
        currentAppointment.appointmentDate = currentRequest.requestedDate;
        currentAppointment.appointmentEnd = currentRequest.requestedEnd;

        if (currentRequest.requestedDurationMinutes != null) {
          currentAppointment.durationMinutes =
            currentRequest.requestedDurationMinutes;
        }

        // Record the decision.
        currentRequest.status = "ACCEPTED";
        currentRequest.rejectionReason = null;
        currentRequest.reviewedAt = new Date();
        currentRequest.reviewedBy = req.user._id;
        currentRequest.reviewedByRole = "DOCTOR";

        await currentAppointment.save({ session });

        updatedAppointment = currentAppointment.toObject();
      });

      // Notify the patient after the rescheduling transaction commits.
      try {
        const patient = await User.findById(
          updatedAppointment.patientId,
        ).select("name email");

        if (patient?.email) {
          const appointmentDate = new Date(
            updatedAppointment.appointmentDate,
          ).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          });

          await sendEmail({
            to: patient.email,
            subject: "MediAI: Rescheduling Request Accepted",
            text: [
              `Hello ${patient.name || "Patient"},`,
              "",
              "Your doctor has accepted your appointment rescheduling request.",
              "",
              `Your new appointment time: ${appointmentDate} (IST)`,
              "",
              "Please log in to MediAI to view your appointment details.",
              "",
              "Regards,",
              "MediAI Team",
            ].join("\n"),
          });
        } else {
          console.warn(
            "Rescheduling acceptance email skipped: patient email not found.",
          );
        }
      } catch (error) {
        console.error(
          "Failed to send rescheduling acceptance email:",
          error.message,
        );
      }

      return res.status(200).json({
        success: true,
        message: "Rescheduling request accepted successfully",
        data: updatedAppointment,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "The requested time is no longer available",
        });
      }

      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Rejecting a request leaves the original appointment time unchanged.
  request.status = "REJECTED";
  request.rejectionReason = rejectionReason.trim();
  request.reviewedAt = new Date();
  request.reviewedBy = req.user._id;
  request.reviewedByRole = "DOCTOR";

  await appointment.save();

  // Notify the patient after the rejection is saved.
  try {
    const patient = await User.findById(appointment.patientId).select(
      "name email",
    );

    if (patient?.email) {
      const originalAppointmentDate = new Date(
        appointment.appointmentDate,
      ).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      await sendEmail({
        to: patient.email,
        subject: "MediAI: Rescheduling Request Rejected",
        text: [
          `Hello ${patient.name || "Patient"},`,
          "",
          "Your doctor has rejected your appointment rescheduling request.",
          "",
          `Your existing appointment time remains: ${originalAppointmentDate} (IST)`,
          `Reason: ${appointment.rescheduleRequest.rejectionReason || "Not provided"}`,
          "",
          "Please log in to MediAI to view your appointment details.",
          "",
          "Regards,",
          "MediAI Team",
        ].join("\n"),
      });
    } else {
      console.warn(
        "Rescheduling rejection email skipped: patient email not found.",
      );
    }
  } catch (error) {
    console.error(
      "Failed to send rescheduling rejection email:",
      error.message,
    );
  }

  return res.status(200).json({
    success: true,
    message: "Rescheduling request rejected successfully",
    data: appointment,
  });
});

const requestDoctorReschedule = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { newAppointmentDate, durationMinutes, reason } = req.body;

  // Validate appointment ID.
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate proposed date.
  if (!newAppointmentDate) {
    return res.status(400).json({
      success: false,
      message: "A valid future appointment date is required",
    });
  }

  const startTime = new Date(newAppointmentDate);

  if (Number.isNaN(startTime.getTime()) || startTime <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "A valid future appointment date is required",
    });
  }

  // Require start time to align to a five-minute boundary.
  const SLOT_DURATION_MS = 5 * 60 * 1000;

  if (startTime.getTime() % SLOT_DURATION_MS !== 0) {
    return res.status(400).json({
      success: false,
      message: "Appointment start time must align to a five-minute interval",
    });
  }

  // Verify doctor is verified.
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

  // Verify doctor account is active.
  const doctorUser = await User.findById(req.user._id).select("accountStatus");

  if (!doctorUser || doctorUser.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  // Find appointment belonging to this doctor.
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

  // Original appointment must be active and in the future.
  if (
    !["CONFIRMED", "SCHEDULED"].includes(appointment.status) ||
    appointment.appointmentDate <= new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: "This appointment is no longer eligible for rescheduling",
    });
  }

  // Do not allow multiple pending requests.
  if (appointment.rescheduleRequest?.status === "PENDING") {
    return res.status(409).json({
      success: false,
      message: "A rescheduling request is already pending",
    });
  }

  // Use existing appointment duration unless a new duration is supplied.
  const duration =
    durationMinutes === undefined
      ? appointment.durationMinutes
      : Number(durationMinutes);

  if (
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 240 ||
    duration % 5 !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Duration must be a multiple of five between 5 and 240 minutes",
    });
  }

  // Validate reason.
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

  // Check for conflicts with other confirmed/scheduled appointments.
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

  // Save the proposal without changing the original appointment time.
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

  // Notify the patient after the doctor's rescheduling request is saved.
  try {
    const patient = await User.findById(appointment.patientId).select(
      "name email",
    );

    if (patient?.email) {
      const formatDate = (date) =>
        new Date(date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });

      await sendEmail({
        to: patient.email,
        subject: "MediAI: Doctor Requested Appointment Rescheduling",
        text: [
          `Hello ${patient.name || "Patient"},`,
          "",
          "Your doctor has requested to reschedule your appointment.",
          "",
          `Current appointment time: ${formatDate(appointment.appointmentDate)} (IST)`,
          `Proposed new time: ${formatDate(appointment.rescheduleRequest.requestedDate)} (IST)`,
          `Reason: ${appointment.rescheduleRequest.reason || "Not provided"}`,
          "",
          "Please log in to MediAI to accept or reject the proposed time.",
          "",
          "Regards,",
          "MediAI Team",
        ].join("\n"),
      });
    } else {
      console.warn(
        "Doctor rescheduling email skipped: patient email address not found.",
      );
    }
  } catch (error) {
    console.error(
      "Failed to send doctor rescheduling request email:",
      error.message,
    );
  }

  return res.status(200).json({
    success: true,
    message: "Rescheduling request sent to the patient successfully",
    data: appointment,
  });
});

const getPendingRescheduleRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

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
  const doctorUser = await User.findById(req.user._id).select("accountStatus");

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

  // Validate appointment ID.
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID",
    });
  }

  // Validate action.
  if (!["ACCEPT", "REJECT"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Action must be ACCEPT or REJECT",
    });
  }

  // Validate rejection reason.
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

  // Verify patient account is active.
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

  // Ensure the appointment belongs to this patient.
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

  // Original appointment must still be active and in the future.
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

  // Verify pending request was initiated by the doctor.
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

  // Validate the proposed time.
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
    const session = await mongoose.startSession();

    try {
      let updatedAppointment;

      await session.withTransaction(async () => {
        // Recheck ownership, appointment status, and request state.
        const currentAppointment = await Appointment.findOne({
          _id: appointmentId,
          patientId: patient._id,
          status: { $in: ["CONFIRMED", "SCHEDULED"] },
          appointmentDate: { $gt: new Date() },
          "rescheduleRequest.status": "PENDING",
          "rescheduleRequest.requestedByRole": "DOCTOR",
        }).session(session);

        if (!currentAppointment) {
          const error = new Error(
            "Appointment or rescheduling request is no longer eligible",
          );
          error.statusCode = 409;
          throw error;
        }

        const currentRequest = currentAppointment.rescheduleRequest;

        // Validate the proposed time again inside the transaction.
        if (
          !currentRequest.requestedDate ||
          !currentRequest.requestedEnd ||
          currentRequest.requestedDate <= new Date() ||
          currentRequest.requestedEnd <= currentRequest.requestedDate
        ) {
          const error = new Error(
            "The requested appointment time is no longer valid",
          );
          error.statusCode = 400;
          throw error;
        }

        // Check for overlapping appointments with the same doctor.
        const conflictingAppointment = await Appointment.findOne({
          _id: { $ne: currentAppointment._id },
          doctorId: currentAppointment.doctorId,
          status: { $in: ["CONFIRMED", "SCHEDULED"] },
          appointmentDate: { $lt: currentRequest.requestedEnd },
          appointmentEnd: { $gt: currentRequest.requestedDate },
        })
          .select("_id")
          .session(session);

        if (conflictingAppointment) {
          const error = new Error("The requested time is no longer available");
          error.statusCode = 409;
          throw error;
        }

        // Generate the proposed time slots.
        const newSlots = generateAppointmentSlots(
          currentRequest.requestedDate,
          currentRequest.requestedEnd,
        );

        // Release the old reservations.
        await AppointmentSlot.deleteMany(
          { appointmentId: currentAppointment._id },
          { session },
        );

        // Reserve the new slots.
        // The unique index protects against duplicate reservations.
        await AppointmentSlot.insertMany(
          newSlots.map((slotStart) => ({
            doctorId: currentAppointment.doctorId,
            appointmentId: currentAppointment._id,
            slotStart,
          })),
          {
            session,
            ordered: true,
          },
        );

        // Apply the new appointment time.
        currentAppointment.appointmentDate = currentRequest.requestedDate;
        currentAppointment.appointmentEnd = currentRequest.requestedEnd;

        if (currentRequest.requestedDurationMinutes != null) {
          currentAppointment.durationMinutes =
            currentRequest.requestedDurationMinutes;
        }

        // Record the patient's decision.
        currentRequest.status = "ACCEPTED";
        currentRequest.rejectionReason = null;
        currentRequest.reviewedAt = new Date();
        currentRequest.reviewedBy = patient._id;
        currentRequest.reviewedByRole = "PATIENT";

        await currentAppointment.save({ session });

        updatedAppointment = currentAppointment.toObject();
      });

      // Notify the doctor after the rescheduling transaction commits.
      try {
        const doctorProfile = await Doctor.findById(
          updatedAppointment.doctorId,
        ).select("userId");

        const doctorUser = doctorProfile
          ? await User.findById(doctorProfile.userId).select("name email")
          : null;

        if (doctorUser?.email) {
          const appointmentDate = new Date(
            updatedAppointment.appointmentDate,
          ).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          });

          await sendEmail({
            to: doctorUser.email,
            subject: "MediAI: Patient Accepted Rescheduling",
            text: [
              `Hello Dr. ${doctorUser.name || ""},`,
              "",
              "The patient has accepted your proposed appointment time.",
              "",
              `Confirmed appointment time: ${appointmentDate} (IST)`,
              "",
              "Please log in to MediAI to view the appointment details.",
              "",
              "Regards,",
              "MediAI Team",
            ].join("\n"),
          });
        } else {
          console.warn(
            "Doctor notification skipped: doctor email address not found.",
          );
        }
      } catch (error) {
        console.error(
          "Failed to send rescheduling acceptance email to doctor:",
          error.message,
        );
      }

      return res.status(200).json({
        success: true,
        message: "Doctor's rescheduling request accepted successfully",
        data: updatedAppointment,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "The requested time is no longer available",
        });
      }

      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Rejecting the request leaves the original appointment time unchanged.
  request.status = "REJECTED";
  request.rejectionReason = rejectionReason.trim();
  request.reviewedAt = new Date();
  request.reviewedBy = patient._id;
  request.reviewedByRole = "PATIENT";

  await appointment.save();

  
  // Notify the doctor after the rejection is saved.
  try {
    const doctorProfile = await Doctor.findById(
      appointment.doctorId
    ).select("userId");

    const doctorUser = doctorProfile
      ? await User.findById(doctorProfile.userId).select("name email")
      : null;

    if (doctorUser?.email) {
      await sendEmail({
        to: doctorUser.email,
        subject: "MediAI: Patient Rejected Rescheduling",
        text: [
          `Hello Dr. ${doctorUser.name || ""},`,
          "",
          "The patient has rejected your proposed appointment time.",
          "",
          `Existing appointment time remains: ${new Date(
            appointment.appointmentDate
          ).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          })} (IST)`,
          `Rejection reason: ${appointment.rescheduleRequest.rejectionReason || "Not provided"}`,
          "",
          "Please log in to MediAI to view the appointment details.",
          "",
          "Regards,",
          "MediAI Team",
        ].join("\n"),
      });
    } else {
      console.warn(
        "Doctor notification skipped: doctor email address not found."
      );
    }
  } catch (error) {
    console.error(
      "Failed to send rescheduling rejection email to doctor:",
      error.message
    );
  }

  return res.status(200).json({
    success: true,
    message: "Doctor's rescheduling request rejected successfully",
    data: appointment,
  });
});

const getPendingDoctorRescheduleRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));

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
