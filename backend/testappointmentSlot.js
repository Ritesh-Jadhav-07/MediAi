
import { generateAppointmentSlots } from "./src/utils/appointmentSlot.js";

const start = new Date("2026-11-10T10:00:00.000Z");
const end = new Date("2026-11-10T10:30:00.000Z");

const slots = generateAppointmentSlots(start, end);

console.log("Number of slots:", slots.length);
console.log(
  "Slot times:",
  slots.map((slot) => slot.toISOString())
);
