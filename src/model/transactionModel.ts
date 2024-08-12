import mongoose from "mongoose";
import AccountBalance from "./accountBalance";
import AccountModel from "./accountModel";
interface ITransactionSchema {
  from: string;
  to: string;
  user: mongoose.Types.ObjectId;
  transactionType: "Income" | "Expense" | "Transfer";
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
    transactionType: {
      type: String,
      enum: ["Income", "Expense", "Transfer"],
      required: true,
    },
    from: {
      type: String,
      required: function () {
        return this.transactionType === "Transfer";
      },
      trim: true,
    },
    to: {
      type: String,
      required: function () {
        return this.transactionType === "Transfer";
      },
      trim: true,
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
      required: true,
    },
    paymentMode: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
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

transactionSchema.post("save", async function (doc: any) {
  const month = doc.createdAt.toLocaleString("default", { month: "long" });
  const year = doc.createdAt.getFullYear();

  if (doc.transactionType === "Income") {
    await handleIncome(doc, month, year);
  } else if (doc.transactionType === "Expense") {
    await handleExpense(doc, month, year);
  }
});

async function handleIncome(doc: any, month: any, year: any) {
  // Update AccountBalance for Income
  await AccountBalance.findOneAndUpdate(
    { userId: doc.user, month, year },
    { $inc: { balance: doc.amount, totalIncome: doc.amount } },
    { upsert: true, new: true }
  );

  // Update account balance in profileModel
  await AccountModel.findOneAndUpdate(
    { user: doc.user, "bankAccounts.provider.providerCode": doc.wallet },
    { $inc: { "bankAccounts.$.balance": doc.amount } },
    { new: true } // Optional: Returns the updated document
  );
}

async function handleExpense(doc: any, month: any, year: any) {
  // Update AccountBalance for Expense
  await AccountBalance.findOneAndUpdate(
    { userId: doc.user, month, year },
    { $inc: { balance: -doc.amount, totalExpenses: doc.amount } },
    { upsert: true, new: true }
  );

  // Update account balance in profileModel
  await AccountModel.findOneAndUpdate(
    { user: doc.user, "bankAccounts.provider.providerCode": doc.wallet },
    { $inc: { "bankAccounts.$.balance": -doc.amount } },
    { new: true } // Optional: Returns the updated document
  );
}

const TransactionModel = mongoose.model("Transactions", transactionSchema);
export default TransactionModel;
