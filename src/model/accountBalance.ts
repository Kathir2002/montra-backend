import mongoose from "mongoose";

const AccountBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    account: {
      type: String,
    },
    month: { type: String, required: true }, // Example: 'January', 'February', etc.
    year: { type: Number, required: true }, // Example: 2024
    balance: { type: Number, required: true, default: 0 }, // Ending balance for the month
    totalExpenses: { type: Number, required: true, default: 0 }, // Total expenses for the month
    totalIncome: { type: Number, required: true, default: 0 }, // Total income for the month
  },
  { timestamps: true }
);

AccountBalanceSchema.index(
  { userId: 1, account: 1, month: 1, year: 1 },
  { unique: true }
);

const AccountBalance = mongoose.model("AccountBalance", AccountBalanceSchema);

export default AccountBalance;
