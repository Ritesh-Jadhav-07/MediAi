import { z } from "zod";

const registerPatientSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(50, "Name cannot exceed 50 characters"),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password cannot exceed 128 characters"),
  }),

  params: z.object({}),

  query: z.object({}),
});

const registerDoctorSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(50),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .transform((value) => value.toLowerCase()),

    password: z
      .string()
      .min(8)
      .max(128),

    qualification: z
      .string()
      .trim()
      .min(2)
      .max(150),

    specialization: z
      .string()
      .trim()
      .min(2)
      .max(100),

    registrationNumber: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .transform((value) => value.toUpperCase()),

    medicalCouncil: z
      .string()
      .trim()
      .min(2)
      .max(150),

    experience: z
      .number()
      .int()
      .min(0)
      .max(80),
  }),

  params: z.object({}),

  query: z.object({}),
});

export {
  registerPatientSchema,
  registerDoctorSchema,
};