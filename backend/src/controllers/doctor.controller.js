import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DoctorAvailability } from "../models/doctorAvailability.model.js";
import { DoctorVerificationHistory } from "../models/doctorVerificationHistory.model.js";

// const updateDoctorProfile = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   const {
//     qualification,
//     specialization,
//     registrationNumber,
//     medicalCouncil,
//     experience,
//   } = req.body;

//   const doctor = await Doctor.findOne({ userId });

//   if (!doctor) {
//     return res.status(404).json({
//       success: false,
//       message: "Doctor profile not found",
//     });
//   }

//   if (doctor.verificationStatus !== "REJECTED") {
//     return res.status(400).json({
//       success: false,
//       message: "Doctor profile cannot be resubmitted from the current status",
//     });
//   }

//   if (
//     !qualification ||
//     !specialization ||
//     !registrationNumber ||
//     !medicalCouncil ||
//     experience === undefined
//   ) {
//     return res.status(400).json({
//       success: false,
//       message: "All doctor profile fields are required",
//     });
//   }

//   doctor.qualification = qualification.trim();
//   doctor.specialization = specialization.trim();
//   doctor.registrationNumber = registrationNumber.trim().toUpperCase();
//   doctor.medicalCouncil = medicalCouncil.trim();
//   doctor.experience = experience;

//   doctor.verificationStatus = "PENDING";
//   doctor.rejectionReason = null;
//   doctor.reviewedBy = null;
//   doctor.reviewedAt = null;

//   await doctor.save();

//   return res.status(200).json({
//     success: true,
//     message: "Doctor profile resubmitted successfully",
//     data: doctor,
//   });
// });

const getDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    userId: req.user._id,
  })
    .populate({
      path: "userId",
      select: "name email profilePhoto role accountStatus createdAt",
    })
    .populate({
      path: "reviewedBy",
      select: "name email role",
    });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Doctor profile fetched successfully",
    data: doctor,
  });
});

const updateDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    userId: req.user._id,
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  // Only rejected doctors can currently resubmit
  if (doctor.verificationStatus !== "REJECTED") {
    return res.status(400).json({
      success: false,
      message: "Doctor profile cannot be resubmitted from the current status",
    });
  }

  const {
    qualification,
    specialization,
    registrationNumber,
    medicalCouncil,
    experience,
  } = req.body;

  if (
    !qualification ||
    !specialization ||
    !registrationNumber ||
    !medicalCouncil ||
    experience === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "All doctor profile fields are required",
    });
  }

  const previousStatus = doctor.verificationStatus;

  doctor.qualification = qualification.trim();
  doctor.specialization = specialization.trim();
  doctor.registrationNumber = registrationNumber.trim().toUpperCase();
  doctor.medicalCouncil = medicalCouncil.trim();
  doctor.experience = experience;

  doctor.verificationStatus = "PENDING";
  doctor.rejectionReason = null;
  doctor.reviewedBy = null;
  doctor.reviewedAt = null;

  await doctor.save();

  await DoctorVerificationHistory.create({
    doctorId: doctor._id,
    performedBy: req.user._id,
    performedByRole: "DOCTOR",
    previousStatus,
    newStatus: "PENDING",
    reason: "Doctor resubmitted profile after rejection",
  });

  return res.status(200).json({
    success: true,
    message: "Doctor profile resubmitted successfully",
    data: doctor,
  });
});

const createAvailability = asyncHandler(async (req, res) => {
  const { dayOfWeek, startTime, endTime } = req.body;

  if (!dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "Day, start time and end time are required",
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
      message: "Only verified doctors can create availability",
    });
  }

  if (startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: "Start time must be before end time",
    });
  }

  const existingAvailability = await DoctorAvailability.findOne({
    doctorId: doctor._id,
    dayOfWeek,
    startTime,
    endTime,
    isActive: true,
  });

  if (existingAvailability) {
    return res.status(409).json({
      success: false,
      message: "This availability slot already exists",
    });
  }

  const availability = await DoctorAvailability.create({
    doctorId: doctor._id,
    dayOfWeek,
    startTime,
    endTime,
  });

  return res.status(201).json({
    success: true,
    message: "Doctor availability created successfully",
    data: availability,
  });
});

const getDoctorAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    userId: req.user._id,
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  const availability = await DoctorAvailability.find({
    doctorId: doctor._id,
  }).sort({ dayOfWeek: 1, startTime: 1 });

  return res.status(200).json({
    success: true,
    message: "Doctor availability fetched successfully",
    count: availability.length,
    data: availability,
  });
});

const updateDoctorAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;
  const { dayOfWeek, startTime, endTime } = req.body;

  if (!dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "Day, start time and end time are required",
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
      message: "Only verified doctors can update availability",
    });
  }

  if (startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: "Start time must be before end time",
    });
  }

  const availability = await DoctorAvailability.findOne({
    _id: availabilityId,
    doctorId: doctor._id,
    isActive: true,
  });

  if (!availability) {
    return res.status(404).json({
      success: false,
      message: "Availability slot not found",
    });
  }

  const overlappingAvailability = await DoctorAvailability.findOne({
    _id: { $ne: availabilityId },
    doctorId: doctor._id,
    dayOfWeek,
    isActive: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

  if (overlappingAvailability) {
    return res.status(409).json({
      success: false,
      message: "This availability overlaps with an existing slot",
    });
  }

  availability.dayOfWeek = dayOfWeek;
  availability.startTime = startTime;
  availability.endTime = endTime;

  await availability.save();

  return res.status(200).json({
    success: true,
    message: "Doctor availability updated successfully",
    data: availability,
  });
});

const deleteDoctorAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;

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
      message: "Only verified doctors can delete availability",
    });
  }

  const availability = await DoctorAvailability.findOne({
    _id: availabilityId,
    doctorId: doctor._id,
    isActive: true,
  });

  if (!availability) {
    return res.status(404).json({
      success: false,
      message: "Availability slot not found",
    });
  }

  availability.isActive = false;

  await availability.save();

  return res.status(200).json({
    success: true,
    message: "Doctor availability removed successfully",
  });
});


export { updateDoctorProfile , getDoctorProfile, createAvailability , getDoctorAvailability, updateDoctorAvailability, deleteDoctorAvailability };