import mongoose from "mongoose";

interface IProfileSchema {
  amount: number;
  accountName: string;
  accountType: string;
  providerName: string;
}

const profileSchema = new mongoose.Schema<IProfileSchema>(
  {
    amount: {
      type: Number,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
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
