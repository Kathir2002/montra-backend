import { Response } from "express";
import { Parser } from "json2csv";
import XLSX from "xlsx";

import { deleteCloudinaryDocument, uploadToCloud } from "../lib/upload";
import TransactionModel from "../model/transactionModel";
import { AuthRequest } from "../middleware/verifyToken";
import quotes from "../constant/quotes.json";

import {
  cleanData,
  getDateRange,
  getRandomItem,
  IPushNotificationPayload,
} from "../lib/functions";
import AccountBalance from "../model/accountBalance";
import User from "../model/userModel";
import BudgetModel from "../model/budgetModel";
import moment from "moment";
import DeviceTokenService from "./deviceTokenController";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";

interface CategoryInterface {
  _id: string;
  categoryName: string;
  categoryId: string;
}

const calculateFileSize = (size: number) => {
  const units = ["Bytes", "KB", "MB"];
  const unitIndex = Math.max(
    0,
    Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  );
  return String((size / 1024 ** unitIndex).toFixed(2) + " " + units[unitIndex]);
};

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

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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
        if (user?.notification?.isExpenseAlert && type !== "Transfer") {
          const data: IPushNotificationPayload = {
            title: `Hai ${user?.name} New Transaction Added`,
            body: `Transaction ${type} of ₹${amount} added successfully`,
            data: {
              screen: type === "Expense" ? "ExpenseDetails" : "IncomeDetails",
              params: save._id.toString(),
            },
          };
          const androidConfig: AndroidConfig = {
            notification: {
              channelId: type == "Expense" ? "expense" : "income",
            },
          };
          await DeviceTokenService.notifyAllDevices(
            userId!,
            data,
            androidConfig
          );
        }
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
      if (transaction?.document?.fileUrl) {
        deleteCloudinaryDocument(transaction?.document?.fileUrl);
      }
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
      let isAddBoolValue = JSON.parse(isAdd as string);
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
        const budgets = await BudgetModel.find({ userId: user });

        if (budgets?.length > 0 && isAddBoolValue) {
          // Filter categories to exclude those in user's expense categories
          const filteredCategories =
            category?.transactionCategory?.expense?.filter((category) => {
              return !budgets?.some(
                (item) => item.category === category?.categoryId
              );
            });

          return res
            .status(200)
            .json({ rows: filteredCategories, success: true });
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

  async getTransactionDetails(req: AuthRequest, res: Response) {
    try {
      const { id } = req.query;
      const userId = req._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }
      const transaction = await TransactionModel.findById(id);
      if (!transaction) {
        return res
          .status(404)
          .json({ message: "Transaction not found", success: false });
      }

      if (transaction.user.toString() !== userId?.toString()) {
        return res.status(403).json({ message: "Forbidden", success: false });
      }
      return res.status(200).json({ transaction, success: true });
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

  async exportTransactionData(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const { transactionType, fileFormat, dateRange } = req?.query;

      const user: any = await User.findById(userId).populate({
        path: "account",
      });
      const bankAccounts = user?.account.bankAccounts;
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      // Build the query
      const query: any = {};
      query.user = userId;
      if (transactionType && transactionType !== "All") {
        query.transactionType = transactionType;
      }
      if (dateRange && dateRange !== "lifeTime") {
        query.transactionDate = getDateRange(dateRange as string);
      }
      const transactionData = await TransactionModel.find(query).lean().exec();

      if (!transactionData?.length) {
        return res?.status(400).json("No transactions found!");
      } else {
        // Transform data and handle optional fields
        const flattenedData = transactionData.map((transaction) => {
          const accountName = bankAccounts.find(
            (bankAccount: any) =>
              bankAccount?.provider?.providerCode === transaction.wallet
          )?.provider?.providerName;

          const baseData: any = {
            "Transaction For": transaction.transactionFor || "",
            Amount: transaction.amount || 0,
            Notes: transaction.notes || "",
            Type: transaction.transactionType || "",
            Date: transaction.transactionDate
              ? moment(new Date(transaction.transactionDate)).format(
                  "DD MMM, hh:mm A"
                )
              : "",
            Account: accountName || "",
            "Payment Mode": transaction.paymentMode || "",
            Description: transaction.description || "",
          };

          // Add frequency fields if they exist
          if (transaction.frequency) {
            if (transaction?.frequency.frequencyType === "yearly") {
              baseData["Frequency"] = `${
                transaction.frequency.frequencyType
              } - Every ${moment()
                .month(Number(transaction.frequency.month) - 1)
                .date(Number(transaction.frequency.date))
                .format("MMM, Do")}`;
            } else if (transaction?.frequency.frequencyType === "monthly") {
              baseData["Frequency"] = `${
                transaction.frequency.frequencyType
              } - Every ${moment()
                .date(Number(transaction.frequency.date))
                .format("Do")}`;
            } else if (transaction?.frequency.frequencyType === "weekly") {
              baseData[
                "Frequency"
              ] = `${transaction.frequency.frequencyType} - Every ${transaction.frequency.day}`;
            } else if (transaction.frequency.frequencyType === "daily") {
              baseData[
                "Frequency"
              ] = `${transaction.frequency.frequencyType} - Every Day`;
            }
            baseData["End Date"] = moment(transaction.endAfter).format(
              "D MMMM YYYY"
            );
          }

          // Add document fields if they exist
          if (transaction.document) {
            if (transaction.document.fileName) {
              baseData["File Name"] = transaction.document.fileName;
            }
            if (transaction.document.fileUrl) {
              // Here we transform the file URL into a hyperlink format
              baseData["File URL"] = {
                t: "s",
                v: transaction.document.fileUrl,
                l: { Target: transaction.document.fileUrl },
              };
            }
            if (transaction.document.fileSize) {
              baseData["Size"] = calculateFileSize(
                transaction.document.fileSize
              );
            }
          }

          return baseData;
        });

        // Get dynamic fields from the data
        const fields = Array.from(
          new Set(flattenedData.flatMap((obj) => Object.keys(obj)))
        );

        if (fileFormat === "CSV") {
          const json2csvParser = new Parser({
            fields,
            delimiter: ",",
            quote: '"',
            header: true,
          });

          const csv = json2csvParser.parse(flattenedData);

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=transactions_${Date.now()}.csv`
          );

          // Send CSV directly
          return res.send(csv);
        } else {
          // Create workbook and worksheet
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.json_to_sheet(flattenedData);

          // Calculate column widths dynamically
          const colWidths = Object.keys(
            flattenedData.reduce((acc, row) => {
              // Merge all field names from all rows
              Object.keys(row).forEach((key) => {
                acc[key] = Math.max(
                  acc[key] || 0,
                  row[key] ? String(row[key]).length : 0 // Get max length between current and new value
                );
              });
              return acc;
            }, {})
          ).map((key) => {
            // Set width to the max length of content + padding
            return { wch: Math.max(key.length, 15) + 5 }; // Add padding and ensure a minimum width
          });

          worksheet["!cols"] = colWidths;
          // Add worksheet to workbook
          XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

          // Generate buffer
          const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "buffer",
            bookSST: false,
          });

          // Set response headers
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=transactions_${Date.now()}.xlsx`
          );

          // Send the file
          res.send(excelBuffer);
        }
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async getQuote(req: AuthRequest, res: Response) {
    try {
      const userId = req?._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          ?.status(404)
          .json({ success: false, message: "User not found!" });
      }
      const quote = getRandomItem(quotes.quotes);
      return res.status(200).json({ success: true, quote });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
}

const Transaction = new transactionController();

export default Transaction;
