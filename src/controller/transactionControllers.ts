import { Response } from "express";
import { uploadToCloud } from "../lib/upload";
import TransactionModel from "../model/transactionModel";
import { AuthRequest } from "../middleware/verifyToken";
import { cleanData } from "../lib/functions";
import AccountBalance from "../model/accountBalance";
import User from "../model/userModel";
import BudgetModel from "../model/budgetModel";

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
        transactionDate,
        notes,
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

      if (amount === "") {
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
      const parsedFrom = from ? JSON.parse(from) : {};
      const parsedTo = to ? JSON.parse(to) : {};

      const newTransaction = new TransactionModel({
        user: userId,
        amount: amount,
        description: description ? description : undefined,
        notes: notes,
        from: from ? parsedFrom : undefined,
        to: to ? parsedTo : undefined,
        transactionType: type,
        isRepeat: isRepeat ? isRepeat : undefined,
        wallet: type === "Expense" || type === "Income" ? wallet : undefined,
        paymentMode:
          type === "Expense" || type === "Income" ? paymentMode : undefined,
        transactionFor: transactionFor,
        document: documet,
        transactionDate: transactionDate,
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
          message: "Error in adding new transaction",
        });
      }
    } catch (err: any) {
      console.log(err);

      res.status(500).json({ message: err?.message, success: false });
    }
  }

  async updateTransaction(req: AuthRequest, res: Response) {
    try {
      const {
        id,
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
        transactionDate,
        notes,
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

      const parsedFrequency = frequency ? JSON.parse(frequency) : {};

      const parsedFrom = from ? JSON.parse(from) : {};
      const parsedTo = to ? JSON.parse(to) : {};

      const updateTransactionData = await TransactionModel.findOneAndUpdate(
        {
          _id: id,
          user: userId,
        },
        {
          amount: amount,
          description: description ? description : undefined,
          notes: notes,
          from: from ? parsedFrom : undefined,
          to: to ? parsedTo : undefined,
          transactionType: type,
          isRepeat: isRepeat ? isRepeat : undefined,
          wallet: type === "Expense" || type === "Income" ? wallet : undefined,
          paymentMode:
            type === "Expense" || type === "Income" ? paymentMode : undefined,
          transactionFor: transactionFor,
          document: documet,
          transactionDate: transactionDate,
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
        },
        { new: true }
      );

      if (updateTransactionData) {
        return res
          .status(200)
          .json({ success: true, message: `${type} updated successfully` });
      } else {
        return res
          .status(500)
          .json({ success: false, message: "Error in updating transaction" });
      }
    } catch (err: any) {
      console.log(err?.message);

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
          sortOptions["transactionDate"] = sortBy === "Newest" ? -1 : 1;
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
        filterOptions["transactionDate"] = { $gte: start, $lte: end };
      }

      const transactions = await TransactionModel.find({
        user: userId,
        ...filterOptions,
      }).sort(
        Object.keys(sortOptions).length > 0
          ? sortOptions
          : { transactionDate: -1 }
      );
      const transactionData = await cleanData(transactions);

      return res.status(200).json({ rows: transactionData, success: true });
    } catch (err: any) {
      console.log(err.message);
      return res.status(500).json({ message: err?.message, success: false });
    }
  }

  async deleteTransaction(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const { transactionId } = req.body;
      if (!transactionId) {
        return res.status(401).json({
          message: "Transaction id is required to delete transaction",
          success: false,
        });
      }
      const transaction = await TransactionModel.findByIdAndDelete(
        transactionId
      );
      if (!transaction) {
        return res
          .status(404)
          .json({ message: "Transaction not found", success: false });
      }
      return res
        .status(200)
        .json({ message: "Transaction deleted successfully", success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message, success: false });
    }
  }
  async getTransactionCategory(req: AuthRequest, res: Response) {
    try {
      const { type, isAdd } = req.query;
      let isAddBoolValue = JSON.parse(isAdd as any);
      if (!type) {
        return res
          .status(400)
          .json({ success: false, message: "Transaction type is required" });
      }
      const user = req._id;
      const category = await User.findById(user);
      if (type === "Expense") {
        return res.status(200).json({
          rows: category?.transactionCategory?.expense,
          success: true,
        });
      } else if (type == "Income") {
        return res
          .status(200)
          .json({ rows: category?.transactionCategory?.income, success: true });
      } else if (type === "Budget") {
        const budget = await BudgetModel.find({ userId: user });

        if (budget?.length > 0 && isAddBoolValue) {
          let data;
          budget?.map((item) => {
            data = category?.transactionCategory?.expense?.filter(
              (res) => res?.categoryId !== item?.category
            );
          });

          return res.status(200).json({ rows: data, success: true });
        }

        return res.status(200).json({
          rows: category?.transactionCategory?.expense,
          success: true,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err?.message, success: false });
    }
  }
  async addNewTransactionCategory(req: AuthRequest, res: Response) {
    try {
      const user = req._id;
      const { categoryName, categoryId, type } = req.body;
      const category = await User.findById(user);
      if (!type) {
        return res
          .status(400)
          .json({ message: "Transaction type is required", success: false });
      }
      if (category) {
        if (type === "Expense" || type === "Budget") {
          category?.transactionCategory?.expense?.map((item) => {
            if (item.categoryId === categoryId) {
              return res
                .status(400)
                .json({ message: "Category already exists", success: false });
            }
          });
          category?.transactionCategory?.expense?.push({
            categoryName,
            categoryId,
          });
        } else if (type == "Income") {
          category?.transactionCategory?.income?.map((item) => {
            if (item.categoryId === categoryId) {
              return res
                .status(400)
                .json({ message: "Category already exists", success: false });
            }
          });
          category?.transactionCategory?.income?.push({
            categoryName,
            categoryId,
          });
        }
      }
      await category?.save();
      if (type === "Expense" || type === "Budget") {
        return res.status(200).json({
          category: category?.transactionCategory.expense,
          success: true,
          message: "Transaction category added successfully",
        });
      } else if (type == "Income") {
        return res.status(200).json({
          category: category?.transactionCategory?.income,
          message: "Transaction category added successfully",
          success: true,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Transaction = new transactionController();

export default Transaction;
