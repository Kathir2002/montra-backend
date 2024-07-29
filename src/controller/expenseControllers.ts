import { Request, Response } from "express";
import ExpenseModel from "../model/expenseModel";
import { IDocument, uploadToCloud } from "../lib/upload";

class expenseController {
  async addExpense(req: Request, res: Response) {
    try {
      const {
        isRepeat,
        endAfter,
        amount,
        transactionFor,
        wallet,
        description,
        frequency,
      } = req.body;
      let documet = undefined;
      if (req.file) {
        documet = uploadToCloud(req, res);
      }
      if (amount === "" || wallet === "" || transactionFor === "") {
        return res
          .status(400)
          .json({ success: false, message: "Please fill required fields" });
      }
      const newExpense = new ExpenseModel({
        amount: amount,
        description: description,
        isRepeat: isRepeat,
        wallet: wallet,
        transactionFor: transactionFor,
        document: documet ? documet : undefined,
        endAfter: isRepeat ? endAfter : undefined,
        frequency: isRepeat ? frequency : undefined,
      });
      await newExpense.save();
      res
        .status(200)
        .json({ message: "Expense added successfuly", success: true });
    } catch (err: any) {
      res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Expense = new expenseController();

export default Expense;
