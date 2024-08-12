import mongoose from "mongoose";
import AccountBalance from "./accountBalance";

interface IProfileSchema {
  bankAccounts: {
    balance: number;
    name: string;
    accountType: string;
    provider: {
      providerName: string;
      providerCode: string;
    };
  }[];
  user: mongoose.Types.ObjectId;
}

const accountSchema = new mongoose.Schema<IProfileSchema>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    const currentDate = new Date();
    const month = currentDate.toLocaleString("default", { month: "long" });
    const year = currentDate.getFullYear();

    // Calculate total balance across all bank accounts
    const totalBalance = doc.bankAccounts.reduce((sum, account) => {
      return sum + account.balance;
    }, 0);

    // Update or create the AccountBalance document for the user
    await AccountBalance.findOneAndUpdate(
      {
        userId: doc.user,
        month,
        year,
      },
      {
        balance: totalBalance,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Error updating AccountBalance:", error);
  }
});

const AccountModel = mongoose.model("Account", accountSchema);
export default AccountModel;
