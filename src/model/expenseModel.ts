import mongoose from "mongoose";
interface IExpenseSchema {
  isRepeat: boolean;
  endAfter: Date;
  amount: number;
  transactionFor: string;
  wallet: string;
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

expenseSchema.path("endAfter").validate(function (value) {
  if (this.isRepeat && !value) {
    throw new Error("endAfter is required when isRepeat is true.");
  }
  return true;
}, "endAfter is required when isRepeat is true.");

// Middleware to validate frequency fields based on isRepeat
expenseSchema.pre("validate", function (next) {
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

  next();
});

const ExpenseModel = mongoose.model("Expense", expenseSchema);
export default ExpenseModel;
