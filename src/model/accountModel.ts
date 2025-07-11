import mongoose from "mongoose";
import AccountBalance from "./accountBalance";
import User from "./userModel";

export interface IAccountSchema {
  totalAccountBalance: number;
  bankAccounts: {
    balance: number;
    _id?: mongoose.Types.ObjectId;
    name: string;
    accountType: string;
    provider: {
      providerName: string;
      providerCode: string;
    };
  }[];
  user: mongoose.Types.ObjectId;
}

const accountSchema = new mongoose.Schema<IAccountSchema>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    totalAccountBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    bankAccounts: [
      {
        balance: {
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
      },
    ],
  },
  { timestamps: true }
);

accountSchema.post("save", async function (doc) {
  try {
    // Calculate total balance across all bank accounts
    const totalBalance = doc.bankAccounts.reduce((sum, account) => {
      return sum + account.balance;
    }, 0);

    await this.updateOne({
      totalAccountBalance: totalBalance,
    });
  } catch (error) {
    console.error("Error updating AccountBalance:", error);
  }
});

accountSchema.post("findOneAndUpdate", async function (doc: IAccountSchema) {
  try {
  } catch (error) {
    console.error("Error deleting AccountBalance:", error);
  }
});

const AccountModel = mongoose.model("Account", accountSchema);
export default AccountModel;
