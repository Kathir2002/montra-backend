import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../middleware/verifyToken";
import User from "../model/userModel";
import { uploadToCloud } from "../lib/upload";
import ContactSupportModel, { IReply } from "../model/contactSupport";
import {
  IPushNotificationPayload,
  MailOptionsInterface,
  sendMail,
} from "../lib/functions";
import mongoose from "mongoose";
import DeviceTokenService from "./deviceTokenController";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";
import { io } from "../helper/socket";
import { text } from "body-parser";

interface Message {
  id: mongoose.Types.ObjectId;
  text: string;
  timestamp: Date;
  replyTo?: IReply;
  senderId: mongoose.Types.ObjectId;
  status?: "sent" | "delivered" | "read";
}

class contactSupportController {
  async addContactSupport(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const { phoneNumber, subject, message } = req.body;
      const request_id = `${user?.name
        ?.toUpperCase()
        ?.slice(0, 4)}_${Date.now()}`;
      if (!phoneNumber || !subject || !message) {
        return res
          .status(400)
          .json({ message: "All fields are required", success: false });
      }

      let documet: any = undefined;

      if (req.file) {
        await uploadToCloud(req, res).then((response) => {
          documet = response;
        });
      }
      const contactSupportData = await ContactSupportModel.create({
        document: documet?.fileUrl ? documet?.fileUrl : undefined,
        email: user?.email,
        message: message,
        name: user?.name,
        phoneNumber: phoneNumber,
        request_id: request_id,
        subject: subject,
        user: userId,
        userImage: user?.picture,
        request_Date: new Date(),
      });

      user.contactSupport.push(contactSupportData._id);

      await user.save();

      const users = await User.find({ isAdmin: true });
      const toEmailIDS: string[] = [];
      users.map((user) => toEmailIDS.push(user.email));
      const dashboard = `${process.env.DEEPLINK_URL}/dashboard`;
      const mailTemplateStyle = `body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
    
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
            }
    
            .header {
                background-color: #7F3DFF;
                color: #ffffff;
                padding: 20px;
                text-align: center;
            }
    
            .content {
                padding: 20px;
            }
    
            .message-box {
                background-color: #f8f9fa;
                border-left: 4px solid #7F3DFF;
                padding: 15px;
                margin: 20px 0;
            }
    
            .footer {
                background-color: #f8f9fa;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #666666;
            }
    
            .button {
                display: inline-block;
                padding: 10px 20px;
                background-color: #7F3DFF;
                color: #ffffff;
                text-decoration: none;
                border-radius: 4px;
                margin: 15px 0;
            }
    
            .field {
                margin-bottom: 10px;
            }
    
            .field-label {
                font-weight: bold;
                color: #333333;
            }
    
            .field-value {
                color: #666666;
            }`;
      const mailConfig: MailOptionsInterface = {
        html: `
            <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
            ${mailTemplateStyle}
        </style>
    </head>
    
    <body>
        <!-- Admin Template -->
        <div class="container">
            <div class="header">
                <h1>New Contact Form Submission</h1>
            </div>
            <div class="content">
                <p>You have received a new contact form submission with the following details:</p>
    
                <div class="field">
                    <div class="field-label">Reference ID:</div>
                    <div class="field-value">${request_id}</div>
                </div>
    
                <div class="field">
                    <div class="field-label">Name:</div>
                    <div class="field-value">${user?.name}</div>
                </div>
    
                <div class="field">
                    <div class="field-label">Email:</div>
                    <a class="field-value" href="mailto:${user?.email}">${
          user?.email
        }</a>
                </div>
    
                <div class="field">
                    <div class="field-label">Phone Number:</div>
                    <a class="field-value" href="tel:${phoneNumber}">${phoneNumber}</a>
                </div>
    
                <div class="field">
                    <div class="field-label">Subject:</div>
                    <div class="field-value">${subject}</div>
                </div>
    
                <div class="message-box">
                    <div class="field-label">Message:</div>
                    <div class="field-value">${message}</div>
                </div>
    
                <div style="text-align: center;">
                    <a href=${dashboard} class="button">View in Dashboard</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated notification from your application's contact system.</p>
                <p>© ${new Date().getFullYear()} Montra. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>
            `,
        to: toEmailIDS,
        subject: "New Contact Form Submission",
        fileContent: req.file ? req.file.buffer : undefined,
        fileName: req.file ? req?.file?.fieldname : undefined,
        fileType: req?.file ? req.file?.mimetype : undefined,
      };
      sendMail(mailConfig)
        .then(() => {
          sendMail({
            html: `
                <!DOCTYPE html>
    <html>
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form Submission Confirmation</title>
        <style>
        ${mailTemplateStyle}
        </style>
    </head>
    
    <body>
        <div class="container">
            <div class="header">
                <h1>Thank You for Contacting Us</h1>
            </div>
            <div class="content">
                <p>Dear ${user?.name},</p>
    
                <p>Thank you for reaching out to us. We have received your message and our team will review it shortly.</p>
    
                <div class="message-box">
                    <p><strong>Your Reference Number:</strong> ${request_id}</p>
                    <p>Please keep this number for future correspondence.</p>
                </div>
    
                <div class="field">
                    <div class="field-label">Subject:</div>
                    <div class="field-value">${subject}</div>
                </div>
    
                <div class="message-box">
                    <div class="field-label">Your Message:</div>
                    <div class="field-value">${message}</div>
                </div>
    
                <p>We typically respond within 24-48 hours during business days. If your matter is urgent, please contact us
                    directly at <a href="mailto:montra.service@gmail.com">montra.service@gmail.com</a>.</p>
    
                <div style="text-align: center;">
                    <a href="#" class="button">Track Your Request</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated confirmation of your contact form submission.</p>
                <p>© ${new Date().getFullYear()} Montra. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>
                `,
            to: user?.email,
            subject: "Thank you for contacting us",
          });
        })
        .then(() => {
          return res.status(200).json({
            message:
              "Thanks for contacting support! We’ll get back to you as soon as possible.",
            success: true,
            request_id,
          });
        })
        .catch((err) => res.status(400).json({ success: false, message: err }));
    } catch (err: any) {
      console.log(err?.message);

      res.status(500).json({ success: false, message: err?.message });
    }
  }
  async getContactSupportList(req: AuthRequest, res: Response) {
    try {
      const { searchText, isAdmin } = req.query;
      const userId = req._id;
      const user = await User.findById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found!", success: false });
      }

      if (isAdmin === "true" && !user?.isAdmin) {
        return res
          .status(403)
          .json({ success: false, message: "User is not an admin" });
      }
      const query: any = {};
      if (searchText) {
        query["request_id"] = {
          $regex: `^${searchText}`,
          $options: "i",
        };
      }

      if (!(isAdmin === "true")) {
        query["user"] = userId;
      }

      const contactSupport = await ContactSupportModel.find(query);

      return res.status(200).json({
        success: true,
        rows: [...contactSupport],
      });
    } catch (err: any) {
      console.log(err?.message);
      res.status(500).json({ success: false, message: err?.message });
    }
  }
  async getContactSupportDetails(req: AuthRequest, res: Response) {
    try {
      const { request_id } = req.query;
      const userId = req._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found!", success: false });
      }

      const contactSupport: any = await ContactSupportModel.findById(
        request_id
      );

      const { updatedAt, __v, createdAt, ...rest } = contactSupport?._doc;

      return res.status(200).json({ success: true, data: rest });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message });
    }
  }
  async getContactChat(req: AuthRequest, res: Response) {
    try {
      const { request_id } = req.query;
      const userId = req._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found!", success: false });
      }

      const contactSupport = await ContactSupportModel.findById(
        request_id
      ).lean();
      if (!contactSupport?.replies) {
        return res
          .status(200)
          .json({ success: true, message: "No message found" });
      }

      const replyToIds = contactSupport.replies
        .map((reply) => reply.replyTo)
        .filter((id) => id); // Remove null values

      // Step 3: Fetch all replies that are being referenced in `replyTo`
      const replyToData = await ContactSupportModel.findOne(
        { _id: request_id },
        { replies: 1 } // Fetch only the `replies` field
      ).lean();

      // Step 4: Create a reply lookup map
      const replyMap = new Map(
        replyToData?.replies?.map((reply: any) => [
          reply?._id.toString(),
          reply,
        ])
      );

      const chats = contactSupport.replies.map((reply) => {
        return {
          id: reply._id,
          text: reply.text,
          timestamp: reply.createdAt,
          replyTo: reply.replyTo
            ? replyMap.get(reply.replyTo.toString())
            : null, // Attach referenced reply
          senderId: reply.sender,
          status: reply?.status,
        };
      });

      return res.status(200).json({
        success: true,
        chats: chats.reverse(),
      });
    } catch (err: any) {
      console.log(err?.message);
      res.status(500).json({ success: false, message: err?.message });
    }
  }
  async addReply(req: any, res: Response) {
    try {
      const userId = req?._id;
      const { message, request_id, replyTo } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const supportRequest = await ContactSupportModel.findById(request_id);
      if (!supportRequest) {
        return res
          .status(404)
          .json({ success: false, message: "Support request not found" });
      }

      // Extract replyTo.id and ensure it's a valid ObjectId
      let replyToId = null;
      if (replyTo && typeof replyTo === "object" && replyTo.id) {
        if (mongoose.Types.ObjectId.isValid(replyTo.id)) {
          replyToId = new mongoose.Types.ObjectId(replyTo.id);
        } else {
          return res.status(400).json({ message: "Invalid replyTo ID" });
        }
      }
      const adminUsers = await User.find({ isAdmin: true });

      const newReply: IReply = {
        sender: userId,
        role: user?.isAdmin ? "Admin" : "User",
        text: message,
        status: "sent",
        createdAt: new Date(),
        replyTo: replyToId,
        senderName: user?.name,
      };

      supportRequest.replies.push(newReply);
      const chat: any = await supportRequest.save();
      const { updatedAt, __v, createdAt, ...rest } = chat?._doc;

      const chats: Message[] = [];
      const replyToData = await ContactSupportModel.findOne(
        { _id: request_id },
        { replies: 1 } // Fetch only the `replies` field
      ).lean();

      // Step 4: Create a reply lookup map
      const replyMap = new Map(
        replyToData?.replies?.map((reply: any) => [
          reply?._id.toString(),
          reply,
        ])
      );

      adminUsers.map(async (adminUser) => {
        if (adminUser?._id !== user?._id) {
          io.to(String(adminUser?._id)).emit("message:receive", {
            id: chat?.doc?._id!,
            text: newReply.text,
            timestamp: newReply?.createdAt,
            senderId: newReply?.sender,
            replyTo: replyTo ? replyMap.get(replyTo.toString()) : null, // Attach referenced reply
            status: "sent",
            type: "message",
          });
        } else {
          io.to(String(user?._id)).emit("message:receive", {
            id: chat?.doc?._id!,
            text: newReply.text,
            timestamp: newReply?.createdAt,
            senderId: newReply?.sender,
            replyTo: replyTo ? replyMap.get(replyTo.toString()) : null, // Attach referenced reply
            status: "sent",
            type: "message",
          });
        }
      });

      rest?.replies?.map((reply: IReply) => {
        chats.push({
          id: reply?._id!,
          text: reply.text,
          timestamp: reply?.createdAt,
          senderId: reply?.sender,
          replyTo: reply.replyTo
            ? replyMap.get(reply.replyTo.toString())
            : null, // Attach referenced reply
          status: reply?.status,
        });
      });

      const data: IPushNotificationPayload = {
        title: `🚀 Received new message from ${user?.name}`,
        body: message,
        data: {
          screen: "ChatView",
          id: request_id,
        },
      };
      const androidConfig: AndroidConfig = {
        notification: {
          channelId: "help-center",
        },
      };

      adminUsers.map(async (adminUser) => {
        if (adminUser?._id !== user?._id) {
          await DeviceTokenService.notifyAllDevices(
            adminUser?._id,
            data,
            androidConfig
          );
        } else {
          await DeviceTokenService.notifyAllDevices(
            user?._id,
            data,
            androidConfig
          );
        }
      });

      res.status(200).json({
        success: true,
        message: "Reply added successfully",
        chats: chats.reverse(),
      });
    } catch (error: any) {
      console.log(error?.message);

      res.status(500).json({
        success: false,
        message: "Error adding reply",
        error: error.message,
      });
    }
  }
}

const ContactSupport = new contactSupportController();

export default ContactSupport;
