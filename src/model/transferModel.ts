import mongoose from "mongoose";

interface ITransferSchema {
  from: string;
  to: string;
  amount: number;
  description: string;
  document: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
  };
}

const transferSchema = new mongoose.Schema<ITransferSchema>(
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

const Transfer = mongoose.model("Transfer", transferSchema);
export default Transfer;
