import express from "express";
import cors from "cors";
import { config } from "dotenv";
config();
import passport from "passport";
import { authRouter } from "./src/routes/authRoute";
import "./src/passport/googleStarategy";

const app = express();

const port = process.env.PORT || 8000;

app.use(passport.initialize());

app.use("/api/auth", authRouter);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
