import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DoctorVerificationHistory } from "../models/doctorVerificationHistory.model.js";

const getPendingDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({
    verificationStatus: "PENDING",
  })
    .populate({
      path: "userId",
      select: "name email profilePhoto accountStatus role",
    })
    .sort({ createdAt: 1 });

  return res.status(200).json({
    success: true,
    message: "Pending doctors fetched successfully",
    count: doctors.length,
    data: doctors,
  });
});

const getDoctorDetails = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId)
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
      message: "Doctor not found",
    });
  }

  if (!doctor.userId || doctor.userId.role !== "DOCTOR") {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Doctor details fetched successfully",
    data: doctor,
  });
});

const approveDoctor = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  if (
    !["PENDING", "UNDER_REVIEW", "INFO_REQUIRED"].includes(
      doctor.verificationStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: `Doctor cannot be approved from ${doctor.verificationStatus} status`,
    });
  }

  const previousStatus = doctor.verificationStatus;

  doctor.verificationStatus = "VERIFIED";
  doctor.rejectionReason = null;
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();

  await doctor.save();

  await DoctorVerificationHistory.create({
  doctorId: doctor._id,
  performedBy: req.user._id,
  performedByRole: "ADMIN",
  previousStatus,
  newStatus: "VERIFIED",
  reason: null,
});

  return res.status(200).json({
    success: true,
    message: "Doctor verified successfully",
    data: doctor,
  });
});

const rejectDoctor = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason is required",
    });
  }

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  if (
    !["PENDING", "UNDER_REVIEW", "INFO_REQUIRED"].includes(
      doctor.verificationStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: `Doctor cannot be rejected from ${doctor.verificationStatus} status`,
    });
  }

  const previousStatus = doctor.verificationStatus;

  doctor.verificationStatus = "REJECTED";
  doctor.rejectionReason = rejectionReason.trim();
  doctor.reviewedBy = req.user._id;
  doctor.reviewedAt = new Date();

  await doctor.save();

  await DoctorVerificationHistory.create({
  doctorId: doctor._id,
  performedBy: req.user._id,
  performedByRole: "ADMIN",
  previousStatus,
  newStatus: "REJECTED",
  reason: rejectionReason.trim(),
});

  return res.status(200).json({
    success: true,
    message: "Doctor rejected successfully",
    data: doctor,
  });
});

const getDoctorVerificationHistory = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  const history = await DoctorVerificationHistory.find({
  doctorId: doctor._id,
})
  .populate({
    path: "performedBy",
    select: "name email role",
  })
  .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Doctor verification history fetched successfully",
    count: history.length,
    data: history,
  });
});

export {
  getPendingDoctors,
  getDoctorDetails,
  approveDoctor,
  rejectDoctor,
  getDoctorVerificationHistory,
};
