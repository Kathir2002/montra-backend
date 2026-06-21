import { NextFunction, Request, Response } from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { decryptDetails } from "../lib/functions";
import mongoose from "mongoose";
import User from "../model/userModel";

export interface AuthRequest extends Request {
  _id?: mongoose.Types.ObjectId;
}

export const verifyToken = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const encryptedToken =
    req.headers.authorization?.split(" ")[1] ||
    req.headers.Authorization?.split(" ")[1];

  if (!encryptedToken) {
    return res
      .status(401)
      .send({ message: "You are unauthorized.", success: false });
  } else {
    const token: string = decryptDetails(encryptedToken)!;
    jwt.verify(
      token,
      process.env.JWT_KEY!,
      async (err: JsonWebTokenError | null, data: any) => {
        if (err) {
          return res
            .status(401)
            .send({ message: "You are unauthorized.", success: false });
        }
        const user = await User.findById(data._id);
        if (!user || user?.tokenVersion !== data.tokenVersion) {
          return res
            .status(401)
            .send({ message: "You are unauthorized.", success: false, });
        }
        req._id = data._id;
        next();
      }
    );

  }
};
