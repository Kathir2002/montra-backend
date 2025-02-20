import express, { Request, Response } from "express";
import mongoose from "mongoose";
import ContactSupport from "../controller/contactSupportController";
import { upload } from "../lib/upload";
export const contactSupportRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: mongoose.Types.ObjectId;
}

contactSupportRouter.post(
  "/add",
  upload.single("file"),
  ContactSupport.addContactSupport
);
contactSupportRouter.get("/get-list", ContactSupport.getContactSupportList);
contactSupportRouter.get(
  "/get-details",
  ContactSupport.getContactSupportDetails
);
contactSupportRouter.get("/chat", ContactSupport.getContactChat);
contactSupportRouter.post("/add-reply", ContactSupport.addReply);
contactSupportRouter.post(
  "/update-request-status",
  ContactSupport.updateRequestStatus
);
