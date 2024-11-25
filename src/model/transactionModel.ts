import mongoose from "mongoose";
import AccountBalance from "./accountBalance";
import AccountModel from "./accountModel";
import moment from "moment";
import BudgetModel from "./budgetModel";
export interface ITransactionSchema {
  from: { wallet: string; paymentMode: string };
  to: { wallet: string; paymentMode: string };
  notes: string;
  user: mongoose.Types.ObjectId;
  transactionType: "Income" | "Expense" | "Transfer";
  transactionDate: Date;
  isRepeat: boolean;
  endAfter: Date;
  amount: number;
  transactionFor: string;
  wallet: string;
  paymentMode: string;
  description: string;
  frequency: {
    frequencyType: string;
    day: string;
    date: number;
    month: string;
  };
  document: {
    fileName: string;
    fileUrl: string;
    fileFormat: string;
    fileSize: number;
  };
}

function isEmpty(obj: any) {
  return JSON.stringify(obj) === "{}";
}

const transactionSchema = new mongoose.Schema<ITransactionSchema>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: ["Income", "Expense", "Transfer"],
      required: true,
    },
    from: {
      paymentMode: {
        type: String,
        required: function () {
          return this.transactionType === "Transfer";
        },
        trim: true,
      },
      wallet: {
        type: String,
        required: function () {
          return this.transactionType === "Transfer";
        },
        trim: true,
      },
    },
    to: {
      paymentMode: {
        type: String,
        required: function () {
          return this.transactionType === "Transfer";
        },
        trim: true,
      },
      wallet: {
        type: String,
        required: function () {
          return this.transactionType === "Transfer";
        },
        trim: true,
      },
    },
    isRepeat: {
      type: Boolean,
      required: function () {
        return (
          this.transactionType === "Income" ||
          this.transactionType === "Expense"
        );
      },
    },
    endAfter: {
      type: Date,
      required: function () {
        return this.isRepeat;
      },
    },
    frequency: {
      frequencyType: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      day: {
        type: String,
      },
      date: {
        type: Number,
      },
      month: {
        type: String,
      },
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionFor: {
      type: String,
      required: function () {
        return (
          this.transactionType === "Expense" || this.transactionType == "Income"
        );
      },
    },
    wallet: {
      type: String,
      required: function () {
        return (
          this.transactionType === "Expense" || this.transactionType == "Income"
        );
      },
    },
    paymentMode: {
      type: String,
      required: function () {
        return (
          this.transactionType === "Expense" || this.transactionType == "Income"
        );
      },
    },
    description: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      required: function () {
        return (
          this.transactionType === "Expense" || this.transactionType == "Income"
        );
      },
    },
    document: {
      fileUrl: {
        type: String,
      },
      fileName: {
        type: String,
      },
      fileFormat: {
        type: String,
      },
      fileSize: {
        type: Number,
      },
    },
  },
  { timestamps: true }
);

transactionSchema.path("endAfter").validate(function (value) {
  if (this.isRepeat && !value) {
    throw new Error("endAfter is required when isRepeat is true.");
  }
  return true;
}, "endAfter is required when isRepeat is true.");

// Middleware to validate frequency fields based on isRepeat
transactionSchema.pre("validate", function (next) {
  if (this.transactionType === "Transfer") {
    if (!this.from) {
      this.invalidate(
        "from",
        "From is required if transaction type is Transfer."
      );
    }
    if (!this.to) {
      this.invalidate("to", "To is required if transaction type is Transfer.");
    }
  } else {
    if (this.isRepeat) {
      const frequency = this.frequency || {};
      if (!frequency || isEmpty(frequency)) {
        this.invalidate(
          "frequency",
          "Frequency object is required if isRepeat is true."
        );
      } else {
        const { frequencyType, day, date, month } = frequency;

        if (frequencyType === "weekly" && !day) {
          this.invalidate(
            "frequency.day",
            "Day is required if frequency frequencyType is weekly."
          );
        }

        if (
          (frequencyType === "monthly" || frequencyType === "yearly") &&
          date == null
        ) {
          this.invalidate(
            "frequency.date",
            "Date is required if frequency frequencyType is monthly or yearly."
          );
        }

        if (frequencyType === "yearly" && !month) {
          this.invalidate(
            "frequency.month",
            "Month is required if frequency frequencyType is yearly."
          );
        }
      }
    }
  }

  next();
});

let originalDoc: ITransactionSchema | null;

transactionSchema.pre("findOneAndUpdate", async function (next) {
  originalDoc = await this.model.findOne(this.getQuery());
  next();
});

transactionSchema.post("save", async function (doc) {
  const month = doc.transactionDate;

  if (doc.transactionType === "Income") {
    await handleIncome(doc, month);
  } else if (doc.transactionType === "Expense") {
    await handleExpense(doc, month);
  } else if (doc.transactionType == "Transfer") {
    handleTransfer(doc, month);
  }
});
//needs to be modified
transactionSchema.post("findOneAndUpdate", async function (doc) {
  const updatedDoc = await this.model.findOne(this.getQuery());

  if (originalDoc?.amount !== updatedDoc.amount) {
    const month = doc.transactionDate;
    // Adjust the balance based on transaction type
    if (updatedDoc.transactionType === "Expense") {
      const amountDifference = originalDoc?.amount! - updatedDoc.amount;
      await AccountBalance.findOneAndUpdate(
        {
          userId: doc.user,
          createdAt: {
            $gte: moment(month).startOf("month"),
            $lte: moment(month).endOf("month"),
          },
        },
        {
          $inc: { balance: amountDifference, totalExpenses: -amountDifference },
        }
      );
      await AccountModel.findOneAndUpdate(
        { user: doc.user, "bankAccounts.provider.providerCode": doc.wallet },
        {
          $inc: {
            "bankAccounts.$.balance": amountDifference,
            totalAccountBalance: amountDifference,
          },
        },
        { new: true } // Optional: Returns the updated document
      );
      const budgetData = await BudgetModel.find({
        userId: updatedDoc.user,
        category: updatedDoc.transactionFor,
        month: {
          $gte: moment(month).startOf("month"),
          $lte: moment(month).endOf("month"),
        },
      });
      if (budgetData?.length > 0) {
        // Calculate the difference
        const difference = updatedDoc.amount - originalDoc?.amount!;
        const remainingAmount =
          budgetData[0].budget - (budgetData[0].spent + difference);
        const spentAmount = budgetData[0].budget - remainingAmount;
        const spentPercent =
          Math.sign(spentAmount) == -1
            ? 100
            : (spentAmount / budgetData[0].budget) * 100;

        await BudgetModel.findByIdAndUpdate(
          budgetData[0]?._id,
          {
            $inc: { spent: difference },
            $set: {
              remaining: remainingAmount,
              spentPercent: spentPercent,
            },
          },
          { new: true }
        );
      }
    } else if (updatedDoc.transactionType === "Income") {
      const amountDifference = updatedDoc.amount - originalDoc?.amount!;
      await AccountBalance.findOneAndUpdate(
        {
          userId: doc.user,
          createdAt: {
            $gte: moment(month).startOf("month"),
            $lte: moment(month).endOf("month"),
          },
        },
        {
          $inc: { balance: amountDifference, totalIncome: amountDifference },
        }
      );

      await AccountModel.findOneAndUpdate(
        { user: doc.user, "bankAccounts.provider.providerCode": doc.wallet },
        {
          $inc: {
            "bankAccounts.$.balance": amountDifference,
            totalAccountBalance: amountDifference,
          },
        },
        { new: true } // Optional: Returns the updated document
      );
    } else {
      const fromDifference = originalDoc?.amount! - doc.amount;
      const toDifference = doc.amount - originalDoc?.amount!;
      await AccountModel.findOneAndUpdate(
        {
          user: doc.user,
          "bankAccounts.provider.providerCode": doc?.from?.wallet,
        },
        { $inc: { "bankAccounts.$.balance": fromDifference } }
      );
      await AccountModel.findOneAndUpdate(
        {
          user: doc.user,
          "bankAccounts.provider.providerCode": doc?.to?.wallet,
        },
        { $inc: { "bankAccounts.$.balance": toDifference } }
      );
    }
  }
});

async function handleIncome(doc: any, month: any, fromDelete = false) {
  // Update AccountBalance for Income
  await AccountBalance.findOneAndUpdate(
    {
      userId: doc.user,
      createdAt: {
        $gte: moment(month).startOf("month"),
        $lte: moment(month).endOf("month"),
      },
    },
    {
      $inc: {
        balance: fromDelete ? -doc.amount : doc.amount,
        totalIncome: fromDelete ? -doc.amount : doc.amount,
      },
    },
    { upsert: true, new: true }
  );

  // Update account balance in accounteModel
  await AccountModel.findOneAndUpdate(
    { user: doc.user, "bankAccounts.provider.providerCode": doc.wallet },
    {
      $inc: {
        "bankAccounts.$.balance": fromDelete ? -doc.amount : doc.amount,
        totalAccountBalance: fromDelete ? -doc.amount : doc.amount,
      },
    },
    { new: true } // Optional: Returns the updated document
  );
}

async function handleTransfer(doc: any, month: any, fromDelete = false) {
  // Update account balance in profileModel
  await AccountModel.findOneAndUpdate(
    { user: doc.user, "bankAccounts.provider.providerCode": doc?.from?.wallet },
    {
      $inc: { "bankAccounts.$.balance": fromDelete ? doc.amount : -doc.amount },
    },
    { new: true } // Optional: Returns the updated document
  );

  await AccountModel.findOneAndUpdate(
    { user: doc.user, "bankAccounts.provider.providerCode": doc?.to?.wallet },
    {
      $inc: { "bankAccounts.$.balance": fromDelete ? -doc.amount : doc.amount },
    },
    { new: true } // Optional: Returns the updated document
  );
}

async function handleExpense(doc: any, month: any, fromDelete = false) {
  // Update AccountBalance for Expense
  await AccountBalance.findOneAndUpdate(
    {
      userId: doc.user,
      createdAt: {
        $gte: moment(month).startOf("month"),
        $lte: moment(month).endOf("month"),
      },
    },
    {
      $inc: {
        balance: fromDelete ? doc.amount : -doc.amount,
        totalExpenses: fromDelete ? -doc.amount : doc.amount,
      },
    },
    { upsert: true, new: true }
  );

  // Update account balance in profileModel
  await AccountModel.findOneAndUpdate(
    { user: doc.user, "bankAccounts.provider.providerCode": doc.wallet },
    {
      $inc: {
        "bankAccounts.$.balance": fromDelete ? doc.amount : -doc.amount,
        totalAccountBalance: fromDelete ? doc.amount : -doc.amount,
      },
    },
    { new: true } // Optional: Returns the updated document
  );

  const budgetData = await BudgetModel.findOne({
    userId: doc.user,
    category: doc?.transactionFor,
    month: {
      $gte: moment(month).startOf("month"),
      $lte: moment(month).endOf("month"),
    },
  });
  if (budgetData !== null) {
    if (fromDelete) {
      budgetData.spent -= doc?.amount;
      budgetData.remaining = budgetData.budget + budgetData?.spent;
      budgetData.spentPercent =
        budgetData.spent > budgetData.budget
          ? 100
          : (budgetData.spent / budgetData.budget) * 100;
    } else {
      budgetData.spent += doc?.amount;
      budgetData.remaining = budgetData.budget - budgetData?.spent;
      budgetData.spentPercent =
        budgetData.spent > budgetData.budget
          ? 100
          : (budgetData.spent / budgetData.budget) * 100;
    }
    await budgetData.save();
  }
}

transactionSchema.post("findOneAndDelete", async (doc) => {
  const month = doc.transactionDate;
  if (doc.transactionType === "Income") {
    await handleIncome(doc, month, true);
  } else if (doc.transactionType === "Expense") {
    await handleExpense(doc, month, true);
  } else if (doc.transactionType == "Transfer") {
    handleTransfer(doc, month, true);
  }
});

const TransactionModel = mongoose.model("Transactions", transactionSchema);
export default TransactionModel;
