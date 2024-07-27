import mongoose from "mongoose";
import { sendMail } from "../lib/functions";
const OTPSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5, // The document will be automatically deleted after 5 minutes of its creation time
  },
});

// Define a function to send emails
async function sendVerificationEmail(email: string, otp: string, name: string) {
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
            <div class="otp">{{${otp}}}</div>
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
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

OTPSchema.pre("save", async function (next: any) {
  if (this.isNew) {
    await sendVerificationEmail(this.email, this.otp, this.name);
  }
  next();
});

const OTP = mongoose.model("OTP", OTPSchema);

export default OTP;
