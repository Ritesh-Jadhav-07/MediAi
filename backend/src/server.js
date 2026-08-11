import { app } from "./app.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import connectDB from "./db/index.js";


dotenv.config({ path: "./.env" });

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Home page");
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is Listening on http://localhost:${port} `);
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });
