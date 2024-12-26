import express, { Request, Response } from "express";
import Auth from "../controller/authControllers";
import { verifyToken } from "../middleware/verifyToken";
import mongoose from "mongoose";
export const authRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: mongoose.Types.ObjectId;
}

authRouter.post("/signup", Auth.signup);
authRouter.post("/verify-otp", Auth.verifyOtp);
authRouter.post("/resend-otp", Auth.resendOtp);
authRouter.post("/signin", Auth.login);
authRouter.post("/forgot-password", Auth.forgotPassword);
authRouter.post("/signin/google", Auth.loginWithGoogle);
authRouter.get("/user-details", verifyToken, Auth.userDetails);
authRouter.post("/reset-password", verifyToken, Auth.restPassword);
authRouter.post("/change-password", verifyToken, Auth.changePassword);
