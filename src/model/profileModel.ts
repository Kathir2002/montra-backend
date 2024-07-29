import mongoose from "mongoose";

interface IProfileSchema {
  accountName: string;
  accountType: string;
  providerName: string;
}

const profileSchema = new mongoose.Schema<IProfileSchema>(
  {
    accountName: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      required: true,
    },
    providerName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ProfileModel = mongoose.model("Profile", profileSchema);
export default ProfileModel;
