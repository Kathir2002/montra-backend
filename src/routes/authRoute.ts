import express, { Request, Response } from "express";
import passport from "passport";
export const authRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: string;
}
authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_BASE_URL + "/signin",
  }),
  (req: any, res: Response, next) => {
    console.log(
      `${process.env.CLIENT_BASE_URL}/${req?.user?.id}`,
      "`${process.env.CLIENT_BASE_URL}/${req?.user?.id}`"
    );

    res.redirect(`${process.env.CLIENT_BASE_URL}/${req?.user?.id}`);
  }
);
