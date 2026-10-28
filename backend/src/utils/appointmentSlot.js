
const SLOT_DURATION_MS = 5 * 60 * 1000;

export const generateAppointmentSlots = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    throw new Error("Invalid appointment time range");
  }

  // Require five-minute alignment for both boundaries.
  if (
    start.getTime() % SLOT_DURATION_MS !== 0 ||
    end.getTime() % SLOT_DURATION_MS !== 0
  ) {
    throw new Error(
      "Appointment start and end times must align to five-minute intervals"
    );
  }

  const slots = [];

  for (
    let slotTime = start.getTime();
    slotTime < end.getTime();
    slotTime += SLOT_DURATION_MS
  ) {
    slots.push(new Date(slotTime));
  }

  return slots;
};
