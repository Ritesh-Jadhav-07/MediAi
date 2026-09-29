import { Patient } from "../models/patient.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Doctor } from "../models/doctor.model.js";

const getPatientProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({
    userId: req.user._id,
  }).populate({
    path: "userId",
    select: "name email profilePhoto role accountStatus createdAt",
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: "Patient profile not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Patient profile fetched successfully",
    data: patient,
  });
});

const updatePatientProfile = asyncHandler(async (req, res) => {
  const {
    dateOfBirth,
    gender,
    bloodGroup,
    phone,
    address,
    emergencyContact,
  } = req.body;

  const patient = await Patient.findOne({
    userId: req.user._id,
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: "Patient profile not found",
    });
  }

  if (dateOfBirth !== undefined) {
    patient.dateOfBirth = dateOfBirth;
  }

  if (gender !== undefined) {
    patient.gender = gender;
  }

  if (bloodGroup !== undefined) {
    patient.bloodGroup = bloodGroup;
  }

  if (phone !== undefined) {
    patient.phone = phone.trim();
  }

  if (address !== undefined) {
    patient.address = address.trim();
  }

  if (emergencyContact !== undefined) {
    patient.emergencyContact = {
      name: emergencyContact.name?.trim() || null,
      phone: emergencyContact.phone?.trim() || null,
      relationship: emergencyContact.relationship?.trim() || null,
    };
  }

  await patient.save();

  return res.status(200).json({
    success: true,
    message: "Patient profile updated successfully",
    data: patient,
  });
});

const getVerifiedDoctors = asyncHandler(async (req, res) => {
  const { specialization, search } = req.query;

  const doctorQuery = {
    verificationStatus: "VERIFIED",
  };

  if (specialization) {
    doctorQuery.specialization = {
      $regex: specialization.trim(),
      $options: "i",
    };
  }

  const doctors = await Doctor.find(doctorQuery)
    .populate({
      path: "userId",
      select: "name email profilePhoto accountStatus role",
      match: {
        role: "DOCTOR",
        accountStatus: "ACTIVE",
      },
    })
    .sort({ createdAt: -1 });

  let activeDoctors = doctors.filter((doctor) => doctor.userId);

  if (search) {
    const searchTerm = search.trim().toLowerCase();

    activeDoctors = activeDoctors.filter((doctor) => {
      const doctorName = doctor.userId.name.toLowerCase();
      const doctorSpecialization =
        doctor.specialization.toLowerCase();

      return (
        doctorName.includes(searchTerm) ||
        doctorSpecialization.includes(searchTerm)
      );
    });
  }

  return res.status(200).json({
    success: true,
    message: "Verified doctors fetched successfully",
    count: activeDoctors.length,
    data: activeDoctors,
  });
});



export {
  getPatientProfile,
    updatePatientProfile,
    getVerifiedDoctors,
};