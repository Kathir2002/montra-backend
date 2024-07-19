import { Request, Response } from "express";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { IUserSchema } from "../model/userModel";
import { encryptDetails } from "../lib/functions";
import { AuthRequest } from "../routes/authRoute";
import { OAuth2Client } from "google-auth-library";

class auth {
  async signup(req: Request, res: Response) {
    const { email, password, name } = req.body;
    try {
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User already exists!", success: false });
      }
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      const user: any = await User.create({
        email: email,
        password: hashedPassword,
        name: name,
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
    const { userId, password }: { userId: string; password: string } = req.body;

    try {
      const existingUser = await User.findOne({ email: userId });

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
        email: existingUser.email,
        picture: existingUser.picture,
      };
      const encryptedToken = encryptDetails(jwtToken);
      return res
        .status(200)
        .json({ user: userData, token: encryptedToken, status: true });
    } catch (error) {
      return res.status(500).json({ message: "Error in login!", error: error });
    }
  }
  async userDetails(req: AuthRequest, res: Response) {
    const userId = req._id;

    try {
      const user = await User.findById(userId);
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
}

const Auth = new auth();

export default Auth;
