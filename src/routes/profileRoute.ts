import express, { Request, Response } from "express";
import Profile from "../controller/profileController";

export const profileRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: string;
}

profileRouter.post("/setup", Profile.setup);
profileRouter.get("/get-wallet-list", Profile.getWalletList);
