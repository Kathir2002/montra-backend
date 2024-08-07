import { Response } from "express";
import { uploadToCloud } from "../lib/upload";
import TransactionModel from "../model/transactionModel";
import { AuthRequest } from "../middleware/verifyToken";
import { cleanData } from "../lib/functions";

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
      const { filterBy, sortBy, category, filterMonth } = req.body;

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

      // Handle filterBy (Assuming filterBy is for a specific field)
      if (filterBy) {
        filterOptions["transactionType"] = filterBy;
      }

      // Handle category filtering (ensure category is a valid array)
      if (Array.isArray(category) && category.length > 0) {
        filterOptions["transactionFor"] = { $in: category };
      }

      // Handle filterMonth (assuming it's a date string to filter by month)
      if (filterMonth) {
        const filterMonthDate = new Date(filterMonth);
        if (!isNaN(filterMonthDate.getTime())) {
          // Check if it's a valid date
          const startOfMonth = new Date(
            filterMonthDate.getFullYear(),
            filterMonthDate.getMonth(),
            1
          );
          const endOfMonth = new Date(
            filterMonthDate.getFullYear(),
            filterMonthDate.getMonth() + 1,
            0
          );
          filterOptions["createdAt"] = { $gte: startOfMonth, $lte: endOfMonth };
        } else {
          return res.status(400).json({ error: "Invalid filterMonth date" });
        }
      }

      const transactions = await TransactionModel.find({
        user: userId,
        ...filterOptions,
      }).sort(sortOptions);
      const transactionData = cleanData(transactions);
      return res.status(200).json({ rows: transactionData, success: true });
    } catch (err: any) {
      console.log(err.message);

      return res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Transaction = new transactionController();

export default Transaction;
