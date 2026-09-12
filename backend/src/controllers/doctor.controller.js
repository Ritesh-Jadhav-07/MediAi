import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const updateDoctorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const {
    qualification,
    specialization,
    registrationNumber,
    medicalCouncil,
    experience,
  } = req.body;

  const doctor = await Doctor.findOne({ userId });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor profile not found",
    });
  }

  if (doctor.verificationStatus !== "REJECTED") {
    return res.status(400).json({
      success: false,
      message: "Doctor profile cannot be resubmitted from the current status",
    });
  }

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

  return res.status(200).json({
    success: true,
    message: "Doctor profile resubmitted successfully",
    data: doctor,
  });
});

export { updateDoctorProfile };