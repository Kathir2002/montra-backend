import { Request, Response } from "express";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../model/userModel";
import { encryptDetails, isValidEmail, sendMail } from "../lib/functions";
import { AuthRequest } from "../routes/authRoute";
import { OAuth2Client } from "google-auth-library";
import OTP from "../model/otpModel";

class auth {
  async signup(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      // Check if all details are provided
      if (!email || !otp) {
        return res.status(403).json({
          success: false,
          message: "All fields are required",
        });
      }
      if (!isValidEmail(email)) {
        return res
          ?.status(400)
          .json({ message: "Enter a valid email address" });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }
      // Find the most recent OTP for the email
      const response = await OTP.find({ email })
        .sort({ createdAt: -1 })
        .limit(1);
      if (response.length === 0 || otp !== response[0].otp) {
        return res.status(400).json({
          success: false,
          message: "The OTP is not valid",
        });
      }

      const user: any = await User.create({
        email: email,
        password: response[0]?.password,
        name: response[0]?.name,
      });
      const userData = {
        email: user.email,
        picture: user.picture,
        name: user.name,
      };
      return res.status(200).json({
        user: userData,
        success: true,
        message: "Account created successfully!",
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message });
    }
  }

  async login(req: Request, res: Response) {
    const { email, password }: { email: string; password: string } = req.body;

    try {
      if (!isValidEmail(email)) {
        return res
          ?.status(400)
          .json({ message: "Enter a valid email address" });
      }
      const existingUser = await User.findOne({ email: email });

      if (!existingUser) {
        return res
          .status(400)
          .json({ message: "User not found", success: false });
      }
      if (existingUser && !existingUser.password) {
        return res?.status(400).json({
          message:
            'Please login to your account with "Login With Google" option',
          success: false,
        });
      }

      const passwordMatched = await bcrypt.compare(
        password,
        existingUser.password
      );

      if (!passwordMatched) {
        return res
          .status(400)
          .json({ message: "Invalid password", success: false });
      }

      const jwtToken = jwt.sign(
        {
          _id: existingUser._id,
          email: existingUser.email,
        },
        process.env.JWT_KEY as string
      );

      const userData = {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        picture: existingUser.picture,
        isSetupDone: existingUser.isSetupDone,
      };
      const encryptedToken = encryptDetails(jwtToken);
      return res
        .status(200)
        .json({ user: userData, token: encryptedToken, success: true });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message });
    }
  }
  async userDetails(req: AuthRequest, res: Response) {
    const email = req._id;

    try {
      const user = await User.findById(email);
      if (!user) {
        return res
          .status(404)
          .json({ message: "No user found", success: false });
      }
      const userData = {
        name: user?.name,
        id: user?._id,
        email: user.email,
        picture: user.picture,
        isSetupDone: user?.isSetupDone,
      };
      res.status(200).json({ user: userData, success: true });
    } catch (error) {
      res.status(500).json({ message: "Can't fetch user details" });
    }
  }
  async loginWithGoogle(req: AuthRequest, res: Response) {
    try {
      const token = req.headers.authorization || req?.headers?.Authorization;
      const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT;

      const client = new OAuth2Client(CLIENT_ID);
      await client
        .verifyIdToken({
          idToken: token as string,
          audience: CLIENT_ID,
        })
        .then(async (ticket) => {
          const payload = ticket.getPayload();
          let existingUser = await User.findOne({ email: payload?.email });

          if (existingUser === null || !existingUser) {
            const newUser: any = await User.create({
              email: payload?.email,
              picture: payload?.picture,
              name: payload?.name,
            });
            const jwtToken = jwt.sign(
              {
                _id: newUser._id,
                email: newUser.email,
              },
              process.env.JWT_KEY as string
            );

            const encryptedToken = encryptDetails(jwtToken);

            return res
              .status(200)
              .json({ user: newUser, token: encryptedToken, success: true });
          }
          const userData = {
            email: existingUser?.email,
            picture: existingUser?.picture,
            id: existingUser._id,
            isSetupDone: existingUser.isSetupDone,
            name: existingUser.name,
          };
          const jwtToken = jwt.sign(
            { _id: existingUser._id, email: existingUser.email },
            process.env.JWT_KEY as string
          );

          const encryptedToken = encryptDetails(jwtToken);
          return res
            .status(200)
            .json({ user: userData, token: encryptedToken, success: true });
        })
        .catch((err) => {
          console.log(err);

          return res
            .status(401)
            .json({ success: false, message: "Token Expired!" });
        });
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  }

  async sendOtp(req: Request, res: Response) {
    try {
      const { email, name, password } = req.body;
      if (!isValidEmail(email)) {
        return res
          ?.status(400)
          .json({ message: "Enter a valid email address" });
      }
      // Check if user is already present
      const checkUserPresent = await User.findOne({ email });
      // If user found with provided email
      if (checkUserPresent) {
        return res.status(401).json({
          success: false,
          message: "User is already registered",
        });
      }
      let otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      let result = await OTP.findOne({ otp: otp });
      while (result) {
        otp = otpGenerator.generate(6, {
          upperCaseAlphabets: false,
        });
        result = await OTP.findOne({ otp: otp });
      }
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      const otpPayload = { email, otp, password: hashedPassword, name };

      await OTP.create(otpPayload);

      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        otp,
      });
    } catch (error: any) {
      console.log(error?.message);
      return res.status(500).json({ success: false, message: error?.message });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!isValidEmail(email)) {
        return res
          ?.status(400)
          .json({ message: "Enter a valid email address", success: false });
      }

      // Check if user already exists
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }
      const jwtToken = jwt.sign(
        {
          _id: user._id,
          email: user.email,
        },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      );

      await sendMail({
        to: email,
        subject: "Reset Password",
        html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
              body {
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
                  color: #555555;
              }
              .container {
                  max-width: 600px;
                  margin: 30px auto;
                  background-color: #ffffff;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                  text-align: center;
                  border-bottom: 2px solid #eeeeee;
                  padding-bottom: 20px;
                  margin-bottom: 20px;
              }
              .header h1 {
                  margin: 0;
                  color: #333333;
                  font-size: 24px;
              }
              .content {
                  padding: 20px 0;
              }
              .content p {
                  line-height: 1.6;
                  font-size: 16px;
              }
              .btn-container {
                  text-align: center;
                  margin: 30px 0;
              }
              .btn {
                  display: inline-block;
                  background-color: #007BFF;
                  color: #ffffff;
                  padding: 15px 30px;
                  font-size: 16px;
                  text-decoration: none;
                  border-radius: 5px;
                  box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2);
                  transition: background-color 0.3s, box-shadow 0.3s;
              }
              .btn:hover {
                  background-color: #0056b3;
                  box-shadow: 0 6px 8px rgba(0, 123, 255, 0.3);
              }
              .footer {
                  text-align: center;
                  padding-top: 20px;
                  border-top: 2px solid #eeeeee;
                  margin-top: 20px;
              }
              .footer p {
                  font-size: 14px;
                  color: #999999;
              }
              .footer a {
                  color: #007BFF;
                  text-decoration: none;
              }
              .footer a:hover {
                  text-decoration: underline;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Reset Your Password</h1>
              </div>
              <div class="content">
                  <p>Hi ${user.name},</p>
                  <p>It looks like you requested a password reset. Don't worry, we've got you covered!</p>
                  <p>Please click the button below to reset your password:</p>
                  <div class="btn-container">
                      <a href="${process.env.DEEPLINK_URL}/reset-password/${jwtToken}" class="btn">Reset Password</a>
                  </div>
                  <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain the same, and no changes will be made.</p>
                  <p>For any further assistance, feel free to contact our support team.</p>
                  <p>Best regards,<br>Montra Support Team</p>
              </div>
              <div class="footer">
                  <p>Contact Information:</p>
                  <p>Email: <a href="mailto:montra.service@gmail.com">montra.service@gmail.com</a></p>
                  <p>Note: This link will expire in 1 hour for your security.</p>
              </div>
          </div>
      </body>
      </html>
      `,
      });
      res.status(200).json({
        success: true,
        message: "Reset password link sent to your email",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async restPassword(req: AuthRequest, res: Response) {
    try {
      const { newPassword } = req.body;
      const userId = req._id;

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      user.password = hashedPassword;
      user.save();

      sendMail({
        to: user.email,
        subject: "Password Reset Successful",
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #7F3DFF;
            color: #ffffff;
            padding: 10px 0;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 20px;
        }
        .footer {
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #777777;
        }
        a {
            color: #4CAF50;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
            <p>Dear ${user?.name},</p>
            <p>We wanted to let you know that your password has been changed successfully.</p>
            <p>If you did not make this change, please contact our support team immediately.</p>
            <p>Thank you,<br>The Montra Team</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Montra. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`,
      });

      res.status(200).json({
        success: true,
        message: "Password has been changed successfully",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
}

const Auth = new auth();

export default Auth;
