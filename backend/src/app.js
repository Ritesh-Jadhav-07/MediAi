import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


import authRoutes from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import doctorRouter from "./routes/doctor.routes.js";
import patientRouter from "./routes/patient.routes.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

app.use("/api/v1/doctor", doctorRouter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/patient", patientRouter);

app.use(errorMiddleware);

export {app};
