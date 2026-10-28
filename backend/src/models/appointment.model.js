
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    appointmentDate: {
      type: Date,
      required: [true, "Appointment date and time are required"],
    },

    appointmentEnd: {
      type: Date,
      required: [true, "Appointment end time is required"],
      validate: {
        validator: function (value) {
          return (
            this.appointmentDate &&
            value instanceof Date &&
            !Number.isNaN(value.getTime()) &&
            value > this.appointmentDate
          );
        },
        message: "Appointment end time must be after start time",
      },
    },

    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: [5, "Appointment duration must be at least 5 minutes"],
      max: [240, "Appointment duration cannot exceed 240 minutes"],
      validate: {
        validator: Number.isInteger,
        message: "Appointment duration must be a whole number of minutes",
      },
    },

    reason: {
      type: String,
      required: [true, "Appointment reason is required"],
      trim: true,
      minlength: [3, "Reason must be at least 3 characters long"],
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },

    status: {
      type: String,
      enum: {
        values: [
          "PENDING",
          "SCHEDULED",
          "CONFIRMED",
          "COMPLETED",
          "CANCELLED",
          "REJECTED",
          "NO_SHOW",
        ],
        message: "Invalid appointment status",
      },
      default: "PENDING",
      required: true,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
      default: null,
    },

    rescheduleRequest: {
      requestedDate: {
        type: Date,
        default: null,
      },

      requestedEnd: {
        type: Date,
        default: null,
      },

      requestedDurationMinutes: {
        type: Number,
        min: [5, "Requested duration must be at least 5 minutes"],
        max: [240, "Requested duration cannot exceed 240 minutes"],
        validate: {
          validator: (value) => value == null || Number.isInteger(value),
          message: "Requested duration must be a whole number",
        },
        default: null,
      },

      reason: {
        type: String,
        trim: true,
        maxlength: [500, "Rescheduling reason cannot exceed 500 characters"],
        default: null,
      },

      status: {
        type: String,
        enum: ["PENDING", "ACCEPTED", "REJECTED"],
        default: null,
      },

      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      // Identifies whether the patient or doctor initiated the request.
      requestedByRole: {
        type: String,
        enum: ["PATIENT", "DOCTOR"],
        default: null,
      },

      requestedAt: {
        type: Date,
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      // Identifies which role reviewed the request.
      reviewedByRole: {
        type: String,
        enum: ["PATIENT", "DOCTOR"],
        default: null,
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Rescheduling rejection reason cannot exceed 500 characters",
        ],
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Retrieve a doctor's appointments chronologically.
appointmentSchema.index({
  doctorId: 1,
  appointmentDate: 1,
});

// Retrieve a patient's appointments chronologically.
appointmentSchema.index({
  patientId: 1,
  appointmentDate: -1,
});

export const Appointment = mongoose.model("Appointment", appointmentSchema);
