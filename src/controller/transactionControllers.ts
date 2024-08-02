import { Request, Response } from "express";
import ExpenseModel from "../model/expenseModel";
import IncomeModel from "../model/IncomeModel";
import { uploadToCloud } from "../lib/upload";
import TransferModel from "../model/transferModel";

class transactionController {
  async addTransaction(req: Request, res: Response) {
    try {
      const {
        isRepeat,
        endAfter,
        amount,
        transactionFor,
        wallet,
        description,
        frequency,
        type,
      } = req.body;

      let documet = undefined;

      if (!type) {
        return res
          .status(400)
          .json({ message: "Transaction type is required" });
      }

      if (req.file) {
        await uploadToCloud(req, res).then((response) => {
          documet = response;
        });
      }

      if (amount === "" || wallet === "" || transactionFor === "") {
        return res
          .status(400)
          .json({ success: false, message: "Please fill required fields" });
      }
      const parsedFrequency = frequency ? JSON.parse(frequency) : {};

      if (type == "Expense") {
        const newExpense = new ExpenseModel({
          amount: amount,
          description: description,
          isRepeat: isRepeat,
          wallet: wallet,
          transactionFor: transactionFor,
          document: documet,
          endAfter: isRepeat ? endAfter : undefined,
          frequency: isRepeat
            ? {
                frequencyType: parsedFrequency?.frequencyType
                  ? parsedFrequency?.frequencyType
                  : undefined,
                day: parsedFrequency?.day ? parsedFrequency?.day : undefined,
                date: parsedFrequency?.date ? parsedFrequency?.date : undefined,
                month: parsedFrequency?.month
                  ? parsedFrequency?.month
                  : undefined,
              }
            : undefined,
        });
        const save = await newExpense.save();

        if (save) {
          return res
            .status(200)
            .json({ success: true, message: "Income added successfully" });
        } else {
          return res.status(500).json({
            success: false,
            message: "Error in sending adding new transaction",
          });
        }
      } else if (type === "Income") {
        const newIncome = new IncomeModel({
          amount: amount,
          description: description,
          isRepeat: isRepeat,
          wallet: wallet,
          transactionFor: transactionFor,
          document: documet,
          endAfter: isRepeat ? endAfter : undefined,
          frequency: isRepeat
            ? {
                frequencyType: parsedFrequency?.frequencyType
                  ? parsedFrequency?.frequencyType
                  : undefined,
                day: parsedFrequency?.day ? parsedFrequency?.day : undefined,
                date: parsedFrequency?.date ? parsedFrequency?.date : undefined,
                month: parsedFrequency?.month
                  ? parsedFrequency?.month
                  : undefined,
              }
            : undefined,
        });

        const save = await newIncome.save();

        if (save) {
          return res
            .status(200)
            .json({ success: true, message: "Income added successfully" });
        } else {
          return res.status(500).json({
            success: false,
            message: "Error in adding new transaction",
          });
        }
      } else if (type === "Transfer") {
        const { from, to, amount, description, type } = req.body;

        if (amount === "" || from === "" || to === "") {
          return res
            .status(400)
            .json({ success: false, message: "Please fill required fields" });
        }

        const newTransfer = new TransferModel({
          from: from,
          to: to,
          description: description,
          amount: amount,
          document: documet,
        });
        const save = await newTransfer.save();

        if (save) {
          return res
            .status(200)
            .json({ success: true, message: "Transfer added successfully" });
        } else {
          return res.status(500).json({
            success: false,
            message: "Error in adding new transaction",
          });
        }
      }
    } catch (err: any) {
      console.log(err);

      res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Transaction = new transactionController();

export default Transaction;
