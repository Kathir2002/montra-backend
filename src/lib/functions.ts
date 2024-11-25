import * as CryptoJS from "crypto-js";
import dorenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
dorenv.config();

export interface IPushNotificationPayload {
  title: string;
  body: string;
  data: string;
}

export interface MailOptionsInterface {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export const decryptDetails = (data: string) => {
  if (data) {
    const bytes = CryptoJS.AES.decrypt(
      data.toString(),
      process.env.SECRET_KEY!
    );
    //@ts-ignore
    const result = bytes.toString(CryptoJS.enc.Utf8).replace("|", /\\/g);
    return result;
  } else {
    return null;
  }
};

/**
 * async function for encrypting the tokens and id details
 */
export const encryptDetails = (data: string) => {
  if (data) {
    const text = CryptoJS.AES.encrypt(
      data.toString(),
      process.env.SECRET_KEY!
    ).toString();
    return text.replace(/\\/g, "|");
  } else {
    return null;
  }
};

export const sendMail = ({ from, html, subject, to }: MailOptionsInterface) => {
  let mailTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    ignoreTLS: false,
    secure: false,
    auth: {
      user: "montra.service@gmail.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions: MailOptionsInterface = {
    from: "montra.service@gmail.com",
    to: to,
    subject: subject,
    html: html,
  };

  mailTransporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log(err.message);
    } else {
      console.log("Email has sent");
    }
  });
};

export function isValidEmail(email: string) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export const cleanData = (data: any) => {
  return data?.map((item: any) => {
    const plainObject = item.toObject ? item.toObject() : item;
    const { user, updatedAt, __v, ...rest } = plainObject;
    return rest;
  });
};

// Define a function to send emails
export async function sendVerificationEmail(
  email: string,
  otp: string,
  name: string
) {
  try {
    const mailResponse = await sendMail({
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f4f8;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #eeeeee;
        }
        .header img {
            width: 80px;
        }
        .content {
            text-align: center;
            padding: 20px;
        }
        .content h1 {
            color: #333333;
            font-size: 24px;
        }
        .otp {
            font-size: 28px;
            font-weight: bold;
            color: #1d72b8;
            margin: 20px 0;
            background-color: #f0f4f8;
            padding: 10px;
            border-radius: 5px;
            display: inline-block;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            font-size: 14px;
            color: #888888;
            border-top: 2px solid #eeeeee;
        }
        .button {
            background-color: #1d72b8;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
            font-size: 18px;
        }
        @media screen and (max-width: 600px) {
            .container {
                width: 100%;
                padding: 10px;
            }
            .content h1 {
                font-size: 20px;
            }
            .otp {
                font-size: 24px;
                padding: 8px;
            }
            .button {
                font-size: 16px;
                padding: 8px 16px;
            }
        }
        @media screen and (max-width: 400px) {
            .content h1 {
                font-size: 18px;
            }
            .otp {
                font-size: 20px;
                padding: 6px;
            }
            .button {
                font-size: 14px;
                padding: 6px 12px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="YOUR_LOGO_URL" alt="Company Logo">
        </div>
        <div class="content">
            <h1>OTP Verification</h1>
            <p>Dear ${name},</p>
            <p>Thank you for registering with us. Please use the following OTP to complete your verification process:</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for the next 5 minutes. Please do not share this OTP with anyone.</p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Thank you,<br>Montra</p>
            <a href="${
              process.env.DEEPLINK_URL
            }/verify-email/${email}" class="button">Complete Verification</a>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Montra. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`,
      subject: "Verify Email to complete signup process!",
      to: email,
    });
    console.log("Email sent successfully: ", mailResponse);
  } catch (error: any) {
    console.log("Error occurred while sending email: ", error?.message);
    throw error;
  }
}

// Helper function to filter transactions
export const getDateRange = (range: string) => {
  const today = new Date();
  switch (range) {
    case "30days":
      return { $gte: new Date(today.setDate(today.getDate() - 30)) };
    case "60days":
      return { $gte: new Date(today.setDate(today.getDate() - 60)) };
    case "6months":
      return { $gte: new Date(today.setMonth(today.getMonth() - 6)) };
    case "1year":
      return { $gte: new Date(today.setFullYear(today.getFullYear() - 1)) };
    case "lifeTime":
      return {}; // No date filter
    default:
      return {};
  }
};

export async function sendPushNotification(
  payload: IPushNotificationPayload,
  deviceToken: string
) {
  const { body, data, title } = payload;
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {}, // Optional additional data
      token: deviceToken,
    };

    // Send a message to the device corresponding to the provided registration token
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:");
    return response;
  } catch (error) {
    console.log("Error sending message:", error);
    throw error;
  }
}
