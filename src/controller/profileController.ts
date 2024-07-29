import { Request, Response } from "express";
import ProfileModel from "../model/profileModel";
import { AuthRequest } from "../routes/authRoute";
import User from "../model/userModel";

class profileController {
  async setup(req: AuthRequest, res: Response) {
    try {
      const { providerName, accountName, accountType, amount } = req.body;
      let user = undefined;
      let isAuthenticated = false;
      if (req._id) {
        user = await User.findById(req._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        isAuthenticated = true;
      }
      if (providerName === "" || accountName === "" || accountType === "")
        return res.status(404).json({
          message: "Please fill all necessary fields",
          success: false,
        });

      const profileData = await ProfileModel.create({
        providerName: providerName,
        accountName: accountName,
        accountType: accountType,
        amount: amount,
      });
      if (isAuthenticated && user) {
        user.profile = profileData._id;
        user.isSetupDone = true;
        await user.save();
      }
      return res
        .status(200)
        .json({ message: "User profile created successfully!", success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
}

const Profile = new profileController();

export default Profile;
