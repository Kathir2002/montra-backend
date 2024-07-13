import express from "express";
import cors from "cors";
import { config } from "dotenv";
import passport from "passport";
import { authRouter } from "./src/routes/authRoute";

const app = express();
config();

const port = process.env.PORT || 8000;

app.use(passport.initialize());

app.use("/api/auth", authRouter);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
