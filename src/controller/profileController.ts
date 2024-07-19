import { Request, Response } from "express";
import ProfileModel from "../model/profileModel";
import { AuthRequest } from "../routes/authRoute";
import User from "../model/userModel";

class profileController {
  async setup(req: AuthRequest, res: Response) {
    const { provider, accountName, accountType } = req.body;
    let user = undefined;
    let isAuthenticated = false;
    if (req._id) {
      user = await User.findById(req._id);
      if (!user) return res.status(404).json({ message: "User not found" });
      isAuthenticated = true;
    }
    if (provider.length === 0 || accountName === "" || accountType === "")
      return res
        .status(404)
        .json({ message: "Please fill all necessary fields", success: false });

    const profileData = await ProfileModel.create({
      provider: provider,
      accountName: accountName,
      accountType: accountType,
    });
    if (isAuthenticated && user) {
      user.profile = profileData._id;
      user.isSetupDone = true;
      await user.save();
    }
    return res
      .status(200)
      .json({ message: "User profile created successfully!", success: true });
    try {
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error signing up!", error: error });
    }
  }
}

const Profile = new profileController();

export default Profile;
