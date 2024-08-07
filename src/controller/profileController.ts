import { Request, Response } from "express";
import ProfileModel from "../model/profileModel";
import { AuthRequest } from "../routes/authRoute";
import User from "../model/userModel";
import { cleanData } from "../lib/functions";

class profileController {
  async setup(req: AuthRequest, res: Response) {
    try {
      const { name, provider, accountType, amount } = req.body;
      let user = undefined;
      let isAuthenticated = false;
      if (req._id) {
        user = await User.findById(req._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        isAuthenticated = true;
      }

      if (
        !(Object?.keys(provider)?.length > 0) ||
        name === "" ||
        accountType === ""
      )
        return res.status(404).json({
          message: "Please fill all necessary fields",
          success: false,
        });

      const profileData = await ProfileModel.create({
        name: name,
        provider: provider,
        accountType: accountType,
        amount: amount,
        user: req._id,
      });

      if (isAuthenticated && user) {
        user.account.push(profileData._id);
        user.isSetupDone = true;
        await user.save();
      }
      return res
        .status(200)
        .json({ message: "User profile created successfully!", success: true });
    } catch (err: any) {
      console.log(err);

      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async getWalletList(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const walletList = await User.findById(userId).populate({
        path: "account",
      });

      const walletData = cleanData(walletList?.account);

      return res.status(200).json({ rows: walletData, success: true });
    } catch (err: any) {
      res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Profile = new profileController();

export default Profile;
