import express, { Request, Response } from "express";
import Auth from "../controller/authControllers";
import { verifyToken } from "../middleware/verifyToken";
export const authRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: string;
}

authRouter.post("/signup", Auth.signup);
authRouter.post("/send-otp", Auth.sendOtp);
authRouter.post("/signin", Auth.login);
authRouter.post("/forgot-password", Auth.forgotPassword);
authRouter.post("/signin/google", Auth.loginWithGoogle);
authRouter.get("/user-details", verifyToken, Auth.userDetails);
