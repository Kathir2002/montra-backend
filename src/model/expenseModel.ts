import mongoose from "mongoose";

interface IExpenseSchema {
  isRepeat: boolean;
  endAfter: Date;
  amount: number;
  transactionFor: string;
  wallet: string;
  description: string;
  frequency: string;
}

const expenseSchema = new mongoose.Schema<IExpenseSchema>(
  {
    isRepeat: {
      type: Boolean,
      default: false,
    },
    endAfter: {
      type: Date,
      validate: {
        validator: function (value) {
          return !this.isRepeat || (this.isRepeat && value != null);
        },
        message: "endAfter is required when isRepeat is true",
      },
    },
    frequency: {
      type: String,
      validate: {
        validator: function (value) {
          return !this.isRepeat || (this.isRepeat && value != null);
        },
        message: "frequency is required when isRepeat is true",
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
  },
  { timestamps: true }
);

const Expense = mongoose.model("Transaction", expenseSchema);
export default Expense;
