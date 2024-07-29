import mongoose from "mongoose";

interface ITransactionSchema {
  from: string;
  to: string;
  amount: number;
  description: string;
}

const transactionSchema = new mongoose.Schema<ITransactionSchema>(
  {
    amount: {
      type: Number,
      required: true,
    },
    from: {
      type: String,
      required: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
