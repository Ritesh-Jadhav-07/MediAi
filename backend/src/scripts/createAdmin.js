import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.model.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({
      role: "ADMIN",
    });

    if (existingAdmin) {
      console.log("Admin already exists.");
      process.exit(0);
    }

    const admin = await User.create({
      name: "System Admin",
      email: "admin@mediai.com",
      password: "Admin@12345",
      role: "ADMIN",
      accountStatus: "ACTIVE",
    });

    console.log("Admin created successfully:");
    console.log({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      accountStatus: admin.accountStatus,
    });

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin:", error);
    process.exit(1);
  }
};

createAdmin();