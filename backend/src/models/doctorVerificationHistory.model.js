import mongoose from "mongoose";

const doctorVerificationHistorySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    previousStatus: {
      type: String,
      enum: [
        "PENDING",
        "UNDER_REVIEW",
        "INFO_REQUIRED",
        "VERIFIED",
        "REJECTED",
        "SUSPENDED",
      ],
      required: true,
    },

    newStatus: {
      type: String,
      enum: [
        "PENDING",
        "UNDER_REVIEW",
        "INFO_REQUIRED",
        "VERIFIED",
        "REJECTED",
        "SUSPENDED",
      ],
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const DoctorVerificationHistory =
  mongoose.model(
    "DoctorVerificationHistory",
    doctorVerificationHistorySchema
  );