import mongoose from "mongoose";
interface IExpenseSchema {
  isRepeat: boolean;
  endAfter: Date;
  amount: number;
  transactionFor: string;
  wallet: string;
  description: string;
  frequency: string;
  document: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
  };
}

const expenseSchema = new mongoose.Schema<IExpenseSchema>(
  {
    isRepeat: {
      type: Boolean,
      default: false,
    },
    endAfter: {
      type: Date,
      required: function () {
        return this.isRepeat;
      },
    },
    frequency: {
      type: String,
      required: function () {
        return this.isRepeat;
      },
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionFor: {
      type: String,
      required: true,
    },
    wallet: {
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
      fileSize: {
        type: Number,
      },
    },
  },
  { timestamps: true }
);

expenseSchema.path("endAfter").validate(function (value) {
  if (this.isRepeat && !value) {
    throw new Error("endAfter is required when isRepeat is true.");
  }
  return true;
}, "endAfter is required when isRepeat is true.");

expenseSchema.path("frequency").validate(function (value) {
  if (this.isRepeat && !value) {
    throw new Error("frequency is required when isRepeat is true.");
  }
  return true;
}, "frequency is required when isRepeat is true.");

const ExpenseModel = mongoose.model("Expense", expenseSchema);
export default ExpenseModel;
