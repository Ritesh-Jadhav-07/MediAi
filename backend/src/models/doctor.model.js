import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true,
      maxlength: [150, "Qualification cannot exceed 150 characters"],
    },

    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
      maxlength: [100, "Specialization cannot exceed 100 characters"],
    },

    registrationNumber: {
      type: String,
      required: [true, "Medical registration number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [100, "Registration number cannot exceed 100 characters"],
    },

    medicalCouncil: {
      type: String,
      required: [true, "Medical council is required"],
      trim: true,
      maxlength: [150, "Medical council cannot exceed 150 characters"],
    },

    experience: {
      type: Number,
      required: [true, "Experience is required"],
      min: [0, "Experience cannot be negative"],
      max: [80, "Invalid experience"],
    },

    verificationStatus: {
      type: String,
      enum: {
        values: [
          "PENDING",
          "UNDER_REVIEW",
          "INFO_REQUIRED",
          "VERIFIED",
          "REJECTED",
          "SUSPENDED",
        ],
        message: "Invalid verification status",
      },
      default: "PENDING",
    },

    rejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, "Rejection reason cannot exceed 1000 characters"],
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);