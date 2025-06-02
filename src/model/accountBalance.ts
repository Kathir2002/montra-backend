import mongoose, { Model, Mongoose } from "mongoose";

interface AccountBalanceModel extends Model<IAccountBalanceSchema> {
  updateBalance(
    userId: mongoose.Types.ObjectId,
    amount: number,
    transactionType: "Income" | "Expense",
    month: Date
  ): Promise<IAccountBalanceSchema>;
  editTransaction(
    userId: mongoose.Types.ObjectId,
    oldAmount: number,
    newAmount: number,
    transactionType: "Income" | "Expense",
    month: Date
  ): Promise<IAccountBalanceSchema>;
  deleteTransaction(
    userId: mongoose.Types.ObjectId,
    amount: number,
    transactionType: "Income" | "Expense",
    month: Date
  ): Promise<IAccountBalanceSchema>;
}

interface IAccountBalanceSchema {
  userId: mongoose.Types.ObjectId;
  totalExpenses: number;
  totalIncome: number;
  month: string;
}

const AccountBalanceSchema = new mongoose.Schema<IAccountBalanceSchema>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalExpenses: { type: Number, required: true, default: 0 }, // Total expenses for the month
    totalIncome: { type: Number, required: true, default: 0 }, // Total income for the month
    month: { type: String, required: true }, // e.g., "2024-12"
  },
  { timestamps: true }
);

AccountBalanceSchema.index({ userId: 1, month: 1 }, { unique: true });

// Static method to update balance based on a transaction
AccountBalanceSchema.statics.updateBalance = async function (
  userId,
  amount,
  transactionType,
  month
) {
  // Fetch account balances for the user
  const accountBalances = await this.find({ userId }).sort({ month: 1 });

  // Locate or create the target month's data
  let targetMonthData = accountBalances.find(
    (entry: any) => entry.month === month
  );
  const previousMonthData =
    accountBalances.length > 0
      ? accountBalances[accountBalances.length - 1]
      : null;

  if (!targetMonthData) {
    // Create new entry for the target month if it doesn't exist
    targetMonthData = await this.create({
      userId,
      balance:
        transactionType === "Income"
          ? (previousMonthData?.balance || 0) + amount
          : (previousMonthData?.balance || 0) - amount,
      totalIncome: transactionType === "Income" ? amount : 0,
      totalExpenses: transactionType === "Expense" ? amount : 0,
      month,
    });
  } else {
    // Update the target month's data
    if (transactionType === "Income") {
      targetMonthData.balance += amount;
      targetMonthData.totalIncome += amount;
    } else if (transactionType === "Expense") {
      targetMonthData.balance -= amount;
      targetMonthData.totalExpenses += amount;
    }
    await targetMonthData.save();
  }

  // Propagate balance changes to subsequent months
  const indexOfTargetMonth = accountBalances.findIndex(
    (entry: any) => entry.month === month
  );
  const startIndex =
    indexOfTargetMonth === -1 ? accountBalances.length : indexOfTargetMonth + 1;

  let cumulativeBalance = targetMonthData.balance;

  for (let i = startIndex; i < accountBalances.length; i++) {
    const entry = accountBalances[i];
    entry.balance = cumulativeBalance;
    cumulativeBalance += entry.totalIncome - entry.totalExpenses;
    await entry.save();
  }
};

AccountBalanceSchema.statics.deleteTransaction = async function (
  userId,
  amount,
  transactionType,
  month
) {
  const accountBalance = await this.findOne({ userId, month });

  if (!accountBalance) {
    throw new Error(
      "Account balance record not found for the specified month."
    );
  }

  if (transactionType === "Income") {
    accountBalance.balance -= amount;
    accountBalance.totalIncome -= amount;
  } else if (transactionType === "Expense") {
    accountBalance.balance += amount;
    accountBalance.totalExpenses -= amount;
  }

  await accountBalance.save();
};

AccountBalanceSchema.statics.editTransaction = async function (
  userId,
  oldAmount,
  newAmount,
  transactionType,
  month
) {
  const accountBalance = await this.findOne({ userId, month });

  if (!accountBalance) {
    throw new Error(
      "Account balance record not found for the specified month."
    );
  }

  const amountDifference = newAmount - oldAmount;

  if (transactionType === "Income") {
    accountBalance.balance += amountDifference;
    accountBalance.totalIncome += amountDifference;
  } else if (transactionType === "Expense") {
    accountBalance.balance -= amountDifference;
    accountBalance.totalExpenses += amountDifference;
  }

  await accountBalance.save();
};

const AccountBalance = mongoose.model<
  IAccountBalanceSchema,
  AccountBalanceModel
>("AccountBalance", AccountBalanceSchema);

export default AccountBalance;
