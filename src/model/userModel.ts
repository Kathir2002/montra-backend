import mongoose from "mongoose";

export interface IUserSchema {
  email: string;
  password: string;
  securityMethod: "PIN" | "FINGERPRINT";
  picture: string;
  phoneNumber?: number;
  isSetupDone: boolean;
  account: mongoose.Types.ObjectId;
  name: string;
  verificationToken: string | undefined;
  isVerified: boolean;
  isActive: boolean;
  deactivatedAt: Date | null;
  lastLogin: Date;
  currency: string;
  transactionCategory: {
    income: { categoryName: string; categoryId: string }[];
    expense: { categoryName: string; categoryId: string }[];
  };
  isAdmin: boolean;
  notification: {
    isExpenseAlert: boolean;
    isBudgetAlert: boolean;
    isTipsAndArticles: boolean;
  };
  contactSupport: mongoose.Types.ObjectId[];
}

const UserSchema = new mongoose.Schema<IUserSchema>(
  {
    deactivatedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
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
    phoneNumber: {
      type: String,
      required: false,
      trim: true,
    },
    picture: {
      type: String,
      default:
        "https://png.pngtree.com/png-vector/20221203/ourmid/pngtree-cartoon-style-female-user-profile-icon-vector-illustraton-png-image_6489286.png",
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
    securityMethod: {
      type: String,
      default: "PIN",
    },
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
        default: true,
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
    contactSupport: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ContactSupport",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
