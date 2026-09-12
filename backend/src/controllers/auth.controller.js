import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Doctor } from "../models/doctor.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerPatient = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.validatedData.body;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "PATIENT",
      accountStatus: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Patient registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register patient",
    });
  }
});


const registerDoctor = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      name,
      email,
      password,
      qualification,
      specialization,
      registrationNumber,
      medicalCouncil,
      experience,
    } = req.validatedData.body;

    const normalizedEmail = email.toLowerCase().trim();

    const normalizedRegistrationNumber =
      registrationNumber.trim().toUpperCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const existingDoctor = await Doctor.findOne({
      registrationNumber: normalizedRegistrationNumber,
    });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: "Doctor with this registration number already exists",
      });
    }

    let createdUser;
    let createdDoctor;

    await session.withTransaction(async () => {
      const users = await User.create(
        [
          {
            name: name.trim(),
            email: normalizedEmail,
            password,
            role: "DOCTOR",
            accountStatus: "ACTIVE",
          },
        ],
        { session }
      );

      createdUser = users[0];

      const doctors = await Doctor.create(
        [
          {
            userId: createdUser._id,
            qualification: qualification.trim(),
            specialization: specialization.trim(),
            registrationNumber: normalizedRegistrationNumber,
            medicalCouncil: medicalCouncil.trim(),
            experience,
            verificationStatus: "PENDING",
          },
        ],
        { session }
      );

      createdDoctor = doctors[0];
    });

    return res.status(201).json({
      success: true,
      message:
        "Doctor registration submitted successfully. Your account is pending verification.",
      data: {
        userId: createdUser._id,
        doctorId: createdDoctor._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        verificationStatus: createdDoctor.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Doctor registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register doctor",
    });
  } finally {
    await session.endSession();
  }
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isPasswordCorrect = await user.isPasswordValid(password);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  if (user.accountStatus !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      message: "Your account is not active",
    });
  }

  const accessToken = user.generateAccessToken();

  let doctorData = null;

  if (user.role === "DOCTOR") {
    doctorData = await Doctor.findOne({
      userId: user._id,
    }).select("verificationStatus specialization qualification");
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      doctor: doctorData,
      accessToken,
    },
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    user: req.user,
  });
});


export {
  registerPatient,
  registerDoctor,
  loginUser,
  getCurrentUser
};