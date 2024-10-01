import mongoose from "mongoose";

export interface IUserSchema {
  email: string;
  password: string;
  picture: string;
  isSetupDone: boolean;
  account: mongoose.Types.ObjectId;
  name: string;
  verificationToken: string | undefined;
  isVerified: boolean;
  lastLogin: Date;
  currency: string;
  transactionCategory: {
    income: { categoryName: string; categoryId: string }[];
    expense: { categoryName: string; categoryId: string }[];
  };
  notification: {
    isExpenseAlert: boolean;
    isBudgetAlert: boolean;
    isTipsAndArticles: boolean;
  };
}

const UserSchema = new mongoose.Schema<IUserSchema>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
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
        "https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/default-account-picture-grey-male-icon.png",
    },
    isSetupDone: {
      type: Boolean,
      required: true,
      default: false,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    notification: {
      isBudgetAlert: {
        type: Boolean,
        default: true,
      },
      isExpenseAlert: {
        type: Boolean,
        default: true,
      },
      isTipsAndArticles: {
        type: Boolean,
        default: false,
      },
    },
    transactionCategory: {
      expense: {
        type: [
          {
            categoryName: {
              type: String,
              required: true,
              trim: true,
            },
            categoryId: {
              type: String,
              required: true,
              trim: true,
            },
          },
        ],
        default: [
          { categoryName: "Rent", categoryId: "Rent" },
          { categoryName: "Shopping", categoryId: "Shopping" },
          { categoryName: "Transportation", categoryId: "Transportation" },
          { categoryName: "Food", categoryId: "Food" },
        ],
      },
      income: {
        type: [
          {
            categoryName: {
              type: String,
              required: true,
              trim: true,
            },
            categoryId: {
              type: String,
              required: true,
              trim: true,
            },
          },
        ],
        default: [
          { categoryName: "Salary", categoryId: "Salary" },
          { categoryName: "Interest", categoryId: "Interest" },
          { categoryName: "Dividend", categoryId: "Dividend" },
        ],
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
