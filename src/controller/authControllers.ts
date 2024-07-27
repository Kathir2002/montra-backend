import { Request, Response } from "express";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { IUserSchema } from "../model/userModel";
import { encryptDetails, isValidEmail } from "../lib/functions";
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
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error signing up!", error: error });
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
    } catch (error) {
      return res.status(500).json({ message: "Error in login!", error: error });
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
      return res.status(500).json({ success: false, error: error?.message });
    }
  }
}

const Auth = new auth();

export default Auth;
