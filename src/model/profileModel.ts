import mongoose from "mongoose";

interface IProfileSchema {
  amount: number;
  name: string;
  accountType: string;
  provider: {
    providerName: string;
    providerCode: string;
  };
  user: mongoose.Types.ObjectId;
}

const profileSchema = new mongoose.Schema<IProfileSchema>(
  {
    amount: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      required: true,
    },
    provider: {
      providerName: {
        type: String,
        required: true,
      },
      providerCode: {
        type: String,
        required: true,
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const ProfileModel = mongoose.model("Profile", profileSchema);
export default ProfileModel;
