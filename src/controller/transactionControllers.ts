import { Response } from "express";
import { uploadToCloud } from "../lib/upload";
import TransactionModel from "../model/transactionModel";
import { AuthRequest } from "../middleware/verifyToken";
import { cleanData } from "../lib/functions";
import AccountBalance from "../model/accountBalance";

class transactionController {
  async addTransaction(req: AuthRequest, res: Response) {
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
        from,
        to,
        paymentMode,
      } = req.body;
      const userId = req._id;
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

      const accountBalance = await AccountBalance.findOne({ userId: userId });
      if (type === "Expense" && Number(accountBalance?.balance) < amount) {
        return res.status(400).json({
          success: false,
          message: "You don't have enough money in your account",
        });
      }

      const newTransaction = new TransactionModel({
        user: userId,
        amount: amount,
        description: description,
        from: from ? from : undefined,
        to: to ? to : undefined,
        transactionType: type,
        isRepeat: isRepeat ? isRepeat : undefined,
        wallet: wallet,
        paymentMode: paymentMode,
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
      const save = await newTransaction.save();

      if (save) {
        return res
          .status(200)
          .json({ success: true, message: `${type} added successfully` });
      } else {
        return res.status(500).json({
          success: false,
          message: "Error in sending adding new transaction",
        });
      }
    } catch (err: any) {
      console.log(err);

      res.status(500).json({ message: err?.message, success: false });
    }
  }

  async getAllTransaction(req: AuthRequest, res: Response) {
    try {
      const { filterBy, sortBy, category, filterByMonth } = req.body;
      const userId = req._id;

      // Construct the sort object
      const sortOptions: any = {};
      if (sortBy) {
        if (sortBy === "Highest" || sortBy === "Lowest") {
          sortOptions["amount"] = sortBy === "Highest" ? -1 : 1;
        } else if (sortBy === "Newest" || sortBy === "Oldest") {
          sortOptions["createdAt"] = sortBy === "Newest" ? -1 : 1;
        }
      }

      // Construct the filter object
      const filterOptions: any = {};
      if (filterBy) {
        filterOptions["transactionType"] = filterBy;
      }
      if (Array.isArray(category) && category.length > 0) {
        filterOptions["transactionFor"] = { $in: category };
      }

      // Determine date range filter
      const now = new Date();
      let start: Date, end: Date;

      if (filterByMonth) {
        const filterMonthDate = new Date(filterByMonth);

        if (!isNaN(filterMonthDate.getTime())) {
          start = new Date(
            filterMonthDate.getFullYear(),
            filterMonthDate.getMonth(),
            1
          );
          end = new Date(
            filterMonthDate.getFullYear(),
            filterMonthDate.getMonth() + 1,
            0
          );
          end.setHours(23, 59, 59, 999);
        } else {
          return res
            .status(400)
            .json({ error: "Invalid filterByDateOption date" });
        }
        filterOptions["createdAt"] = { $gte: start, $lte: end };
      }

      const transactions = await TransactionModel.find({
        user: userId,
        ...filterOptions,
      }).sort(
        Object.keys(sortOptions).length > 0 ? sortOptions : { createdAt: -1 }
      );
      const transactionData = await cleanData(transactions);
      return res.status(200).json({ rows: transactionData, success: true });
    } catch (err: any) {
      console.log(err.message);
      return res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Transaction = new transactionController();

export default Transaction;
