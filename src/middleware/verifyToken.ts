import { NextFunction, Request, Response } from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { decryptDetails } from "../lib/functions";

export interface AuthRequest extends Request {
  _id?: string;
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
      (err: JsonWebTokenError | null, data: any) => {
        if (err) {
          return res
            .status(401)
            .send({ message: "You are unauthorized.", success: false });
        }
        req._id = data._id;
        next();
      }
    );
  }
};
