import { NextFunction, Response } from "express";
import { AuthRequest } from "./verifyToken";
import User from "../model/userModel";

export const verifyAdmin = async (req: AuthRequest,
    res: Response,
    next: NextFunction) => {
    const user = await User.findById(req?._id);
    if (!user) {
        return res.status(401).send({ message: "You are unauthorized.", success: false });
    }
    if (!user.isAdmin) {
        return res.status(401).send({ message: "You are not authorized to perform this action.", success: false });
    }
    next();
}