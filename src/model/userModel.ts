import mongoose from "mongoose";

export interface IUserSchema {
  email: string;
  password: string;
  picture: string;
}

const UserSchema = new mongoose.Schema<IUserSchema>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
      trim: true,
    },
    picture: {
      type: String,
      default:
        "https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/default-profile-picture-grey-male-icon.png",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
