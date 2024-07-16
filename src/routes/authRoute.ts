import express, { Request, Response } from "express";
import Auth from "../controller/authControllers";
export const authRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: string;
}

authRouter.post("/signup", Auth.signup);
authRouter.post("/signin", Auth.login);
authRouter.post("/signin/google", Auth.loginWithGoogle);
