import mongoose from "mongoose";
import TransactionModel from "./transactionModel";
import moment from "moment";

interface IMonthlyBudget {
  userId: mongoose.Types.ObjectId;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  month: Date;
  alertValue: number;
  isReceiveAlert: boolean;
}

const monthlyBudgetSchema = new mongoose.Schema<IMonthlyBudget>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  budget: {
    type: Number,
    required: true,
    trim: true,
  },
  spent: {
    type: Number,
    trim: true,
    default: 0,
  },
  remaining: {
    type: Number,
    trim: true,
    default: function () {
      return this.budget - this.spent;
    },
  },
  month: {
    type: Date,
    required: true,
  },
  isReceiveAlert: {
    type: Boolean,
    default: false,
  },
  alertValue: {
    type: Number,
    required: function () {
      return this.isReceiveAlert;
    },
  },
});

let orginalBugetValue: IMonthlyBudget | null;
monthlyBudgetSchema.pre("findOneAndUpdate", async function (next) {
  orginalBugetValue = await this.model.findOne(this.getQuery());
  next();
});

monthlyBudgetSchema.post("findOneAndUpdate", async function () {
  const updatedDoc = await this.model.findOne(this.getQuery());

  if (orginalBugetValue?.budget !== updatedDoc?.budget) {
    // Update the remaining value

    // updatedDoc.remaining = updatedDoc.budget - updatedDoc.spent;
    const transactionData = await TransactionModel.find({
      transactionDate: {
        $gte: moment(updatedDoc.month).startOf("month"),
        $lte: moment(updatedDoc.month).endOf("month"),
      },
      user: updatedDoc.userId,

      transactionFor: updatedDoc.category,
      transactionType: "Expense",
    });

    if (transactionData.length > 0) {
      const totalExpenseForCategory = transactionData.reduce((total, item) => {
        return total + item.amount;
      }, 0);

      // Update spent and remaining in the document
      updatedDoc.spent = totalExpenseForCategory;
      updatedDoc.remaining = updatedDoc.budget - totalExpenseForCategory;

      // Save the updated document
      await updatedDoc.save();
    }
  }
});
monthlyBudgetSchema.post("save", async function () {
  const transactionData = await TransactionModel.find({
    transactionDate: {
      $gte: moment(this.month).startOf("month"),
      $lte: moment(this.month).endOf("month"),
    },
    user: this.userId,

    transactionFor: this.category,
    transactionType: "Expense",
  });

  if (transactionData.length > 0) {
    const totalExpenseForCategory = transactionData.reduce((total, item) => {
      return total + item.amount;
    }, 0);

    await this.updateOne({
      spent: totalExpenseForCategory,
      remaining: this.budget - totalExpenseForCategory,
    });
  }
});

const BudgetModel = mongoose.model("budget", monthlyBudgetSchema);
export default BudgetModel;
