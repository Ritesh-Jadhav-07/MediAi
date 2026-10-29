
import mongoose from "mongoose";

const appointmentSlotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    // Start time of one five-minute slot, stored as a UTC Date.
    slotStart: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// A doctor cannot have two reservations for the same slot.
appointmentSlotSchema.index(
  { doctorId: 1, slotStart: 1 },
  { unique: true, name: "unique_doctor_time_slot" }
);

// Helps release all reservations belonging to an appointment.
appointmentSlotSchema.index(
  { appointmentId: 1 },
  { name: "appointment_slot_lookup" }
);

export const AppointmentSlot = mongoose.model(
  "AppointmentSlot",
  appointmentSlotSchema
);
