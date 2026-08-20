import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import {Doctor} from "../models/doctor.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const registerPatient = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.validatedData.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email,
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
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !qualification ||
      !specialization ||
      !registrationNumber ||
      !medicalCouncil ||
      experience === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

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

export { registerPatient, registerDoctor };
