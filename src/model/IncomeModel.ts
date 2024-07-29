import mongoose from "mongoose";

interface IIncomeSchema {
  isRepeat: boolean;
  endAfter: Date;
  amount: number;
  transactionFor: string;
  wallet: string;
  description: string;
  frequency: string;
}

const incomeSchema = new mongoose.Schema<IIncomeSchema>(
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

const Income = mongoose.model("Transaction", incomeSchema);
export default Income;
