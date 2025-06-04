import { Request, Response } from "express";
import { Parser } from "json2csv";
import XLSX from "xlsx";
import path from "path";
import fs from "fs/promises";

import { deleteCloudinaryDocument, uploadToCloud } from "../lib/upload";
import TransactionModel, {
  ITransactionSchema,
} from "../model/transactionModel";
import { AuthRequest } from "../middleware/verifyToken";
import quotes from "../constant/quotes.json";

import {
  cleanData,
  formatCurrency,
  getDateRange,
  getRandomItem,
  IPushNotificationPayload,
  sendMail,
} from "../lib/functions";
import User from "../model/userModel";
import BudgetModel from "../model/budgetModel";
import moment from "moment";
import DeviceTokenService from "./deviceTokenController";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";
import AccountModel, { IAccountSchema } from "../model/accountModel";

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

interface TransactionSummary {
  expense: {
    totalAmount: string;
    averageAmount: string;
    totalTransactionsCount: number;
    largestTransactionAmount: string;
  };
  income: {
    totalAmount: string;
    averageAmount: string;
    totalTransactionsCount: number;
    largestTransactionAmount: string;
  };
  balance: string;
}

const processTransactionData = async (
  transactions: ITransactionSchema[],
  user: any
): Promise<TransactionSummary> => {
  const currencySymbol = user?.currency;
  const intialNum = 0;
  const summary: TransactionSummary = {
    expense: {
      totalAmount: formatCurrency(
        parseFloat(intialNum.toFixed(2)),
        currencySymbol
      ),
      averageAmount: formatCurrency(
        parseFloat(intialNum.toFixed(2)),
        currencySymbol
      ),
      totalTransactionsCount: 0,
      largestTransactionAmount: formatCurrency(
        parseFloat(intialNum.toFixed(2)),
        currencySymbol
      ),
    },
    income: {
      totalAmount: formatCurrency(
        parseFloat(intialNum.toFixed(2)),
        currencySymbol
      ),
      averageAmount: formatCurrency(
        parseFloat(intialNum.toFixed(2)),
        currencySymbol
      ),
      totalTransactionsCount: 0,
      largestTransactionAmount: formatCurrency(
        parseFloat(intialNum.toFixed(2)),
        currencySymbol
      ),
    },
    balance: formatCurrency(parseFloat(Number(0).toFixed(2)), currencySymbol),
  };

  // Split transactions by type
  const expenses = transactions.filter((t) => t.transactionType === "Expense");
  const incomes = transactions.filter((t) => t.transactionType === "Income");

  // Process expenses
  if (expenses.length > 0) {
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avgExpense = totalExpense / expenses.length;
    const maxExpense = Math.max(...expenses.map((t) => t.amount));

    summary.expense = {
      totalAmount: formatCurrency(
        parseFloat(totalExpense.toFixed(2)),
        currencySymbol
      ),
      averageAmount: formatCurrency(
        parseFloat(avgExpense.toFixed(2)),
        currencySymbol
      ),
      totalTransactionsCount: expenses.length,
      largestTransactionAmount: formatCurrency(
        parseFloat(maxExpense.toFixed(2)),
        currencySymbol
      ),
    };
  }

  // Process incomes
  if (incomes.length > 0) {
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const avgIncome = totalIncome / incomes.length;
    const maxIncome = Math.max(...incomes.map((t) => t.amount));

    summary.income = {
      totalAmount: formatCurrency(
        parseFloat(totalIncome.toFixed(2)),
        currencySymbol
      ),
      averageAmount: formatCurrency(
        parseFloat(avgIncome.toFixed(2)),
        currencySymbol
      ),
      totalTransactionsCount: incomes.length,
      largestTransactionAmount: formatCurrency(
        parseFloat(maxIncome.toFixed(2)),
        currencySymbol
      ),
    };
  }

  const accountBalance = await AccountModel.findById(user?.account);
  summary.balance = formatCurrency(
    parseFloat(accountBalance?.totalAccountBalance?.toFixed(2)!),
    currencySymbol
  );

  return summary;
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

      const accountData = await AccountModel.findById(user?.account);
      const parsedWallet = wallet ? JSON.parse(wallet) : {};
      const accountBalance = accountData?.bankAccounts.find(
        (bankAccount) => String(bankAccount?._id) === String(parsedWallet?.id)
      );

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
        wallet:
          type === "Expense" || type === "Income" ? parsedWallet : undefined,
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
        await DeviceTokenService.notifyAllDevices(userId!, data, androidConfig);
      }

      return res
        .status(200)
        .json({ success: true, message: `${type} added successfully` });
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
      const user = await User.findById(userId);
      if (!type) {
        return res
          .status(400)
          .json({ message: "Transaction type is required" });
      }

      if (req.file) {
        await uploadToCloud(req, res)
          .then((response) => {
            documet = response;
          })
          .catch((err: any) => {
            return res
              .status(400)
              .json({ message: err?.message, success: false });
          });
      }
      const prevTransaction = await TransactionModel.findById(id);

      // const accountBalance = await AccountBalance.findOne({ userId: userId });

      const accountData = await AccountModel.findById(user?.account);
      const parsedWallet = wallet ? JSON.parse(wallet) : {};
      const accountBalance = accountData?.bankAccounts.find(
        (bankAccount) => String(bankAccount?._id) === String(parsedWallet?.id)
      );
      if (
        type === "Expense" &&
        Number(accountBalance?.balance) >
          Number(prevTransaction?.amount) - amount
      ) {
        return res.status(400).json({
          success: false,
          message: "You don't have enough money in your account",
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
          wallet:
            type === "Expense" || type === "Income" ? parsedWallet : undefined,
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

      if (!transaction) {
        return res
          .status(404)
          .json({ message: "Transaction not found", success: false });
      }
      if (transaction?.document?.fileUrl) {
        deleteCloudinaryDocument(transaction?.document?.fileUrl);
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
      } else if (type === "All") {
        const data: any = {
          income: [],
          expense: [],
        };
        category?.transactionCategory?.expense?.map((res) => {
          data?.expense?.push(res?.categoryName);
        });
        category?.transactionCategory?.income?.map((res) => {
          data?.income?.push(res?.categoryName);
        });
        return res.status(200).json({ rows: data, success: true });
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

      const { transactionType, fileFormat, dateRange, isChecking } = req?.query;

      const user: any = await User.findById(userId).populate({
        path: "account",
      });
      const bankAccounts: IAccountSchema["bankAccounts"] =
        user?.account.bankAccounts;
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
      if (dateRange) {
        query.transactionDate = getDateRange(dateRange as string);
      }

      const transactionData = await TransactionModel.find(query).lean().exec();
      if (!transactionData?.length) {
        return res?.status(400).json({
          message: "No transactions found to download!",
          success: false,
        });
      }

      if (isChecking) {
        return res?.status(200).json({
          success: true,
          message: "Transaction available for download",
        });
      }

      const transactionSummaryData = await processTransactionData(
        transactionData,
        user
      );

      // Transform data and handle optional fields
      const flattenedData = transactionData.map((transaction) => {
        const accountName = bankAccounts.find((bankAccount) =>
          bankAccount?._id?.equals(transaction?.wallet?.id)
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
        };

        // Add frequency fields if they exist
        if (transaction?.description) {
          baseData["Description"] = transaction?.description;
        }
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
            baseData["Size"] = calculateFileSize(transaction.document.fileSize);
          }
        }

        return baseData;
      });

      // Get dynamic fields from the data
      const fields = Array.from(
        new Set(flattenedData.flatMap((obj) => Object.keys(obj)))
      );
      const expenseHtmlContent = `
                    <tr>
                        <td style="padding: 0 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; background-color: #fbe9eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <h3 style="margin: 0; color: #dc3545;">Expenses Breakdown</h3>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px;">
                                            <tr>
                                                <td width="50%" style="padding: 5px; color: #666;">Total Transactions</td>
                                                <td width="50%" align="right" style="padding: 5px;">${transactionSummaryData?.expense?.totalTransactionsCount}</td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="padding: 5px; color: #666;">Average Amount</td>
                                                <td width="50%" align="right" style="padding: 5px;">${transactionSummaryData?.expense?.averageAmount}</td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="padding: 5px; color: #666;">Largest Transaction</td>
                                                <td width="50%" align="right" style="padding: 5px;">${transactionSummaryData?.expense?.largestTransactionAmount}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    `;

      const incomeHtmlContent = `
        <tr>
          <td style="padding: 0 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; background-color: #e8f5e9; border-radius: 6px;">
                  <tr>
                      <td style="padding: 15px;">
                          <h3 style="margin: 0; color: #28a745;">Income Breakdown</h3>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px;">
                              <tr>
                                  <td width="50%" style="padding: 5px; color: #666;">Total Transactions</td>
                                  <td width="50%" align="right" style="padding: 5px;">${transactionSummaryData?.income?.totalTransactionsCount}</td>
                              </tr>
                              <tr>
                                  <td width="50%" style="padding: 5px; color: #666;">Average Amount</td>
                                  <td width="50%" align="right" style="padding: 5px;">${transactionSummaryData?.income?.averageAmount}</td>
                              </tr>
                              <tr>
                                  <td width="50%" style="padding: 5px; color: #666;">Largest Transaction</td>
                                  <td width="50%" align="right" style="padding: 5px;">${transactionSummaryData?.income?.largestTransactionAmount}</td>
                              </tr>
                          </table>
                      </td>
                  </tr>
              </table>
          </td>
      </tr>
        `;

      const mailContent = () => {
        return `
              <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Transaction Report</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
              <td align="center">
                  <!-- Main Container -->
                  <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                          <td align="center" style="padding: 30px 20px; border-bottom: 2px solid #eee;">
                              <h1 style="margin: 0; color: #2c3e50; font-size: 24px;">Transaction Report</h1>
                              <p style="margin: 10px 0 0 0; color: #666;">Period: ${
                                dateRange === "lifeTime"
                                  ? "Lifetime"
                                  : moment(
                                      query.transactionDate["$gte"]
                                    ).format("MMMM D")
                              }${
          dateRange === "lifeTime"
            ? ""
            : " - " + moment(new Date()).format("MMMM D, YYYY")
        }</p>
                          </td>
                      </tr>

                        <!-- Summary -->
                      <tr>
                          <td style="padding: 0 20px;">
                              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #e8f4fd; border-radius: 6px;${
                                transactionType !== "All"
                                  ? "margin-bottom: 20px;"
                                  : "margin-bottom: 0px;"
                              }">
                                  <tr>
                                      <td style="padding: 15px;">
                                          <p style="margin: 0 0 10px 0;">Dear ${
                                            user?.name
                                          },</p>
                                          <p style="margin: 0;">Please find attached your transaction report for the specified period. Below is a summary of key metrics:</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- Total Summary -->
                      ${
                        transactionType === "All"
                          ? `
                        <tr>
                          <td style="padding: 20px;">
                              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; background-color: #f8f9fa; border-radius: 6px;">
                                  <tr>
                                      <td align="center" style="padding: 15px;">
                                          <h2 style="margin: 0; font-size: 18px; color: #2c3e50;">Overall Summary</h2>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td>
                                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                              <tr>
                                                  <td width="33%" align="center" style="padding: 10px;">
                                                      <p style="margin: 0; font-size: 14px; color: #666;">Total Income</p>
                                                      <h3 style="margin: 5px 0; color: #28a745;">+ ${transactionSummaryData?.income?.totalAmount}</h3>
                                                  </td>
                                                  <td width="33%" align="center" style="padding: 10px;">
                                                      <p style="margin: 0; font-size: 14px; color: #666;">Total Expenses</p>
                                                      <h3 style="margin: 5px 0; color: #dc3545;">- ${transactionSummaryData?.expense?.totalAmount}</h3>
                                                  </td>
                                                  <td width="33%" align="center" style="padding: 10px;">
                                                      <p style="margin: 0; font-size: 14px; color: #666;">Net Balance</p>
                                                      <h3 style="margin: 5px 0; color: #17a2b8;">${transactionSummaryData?.balance}</h3>
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                        `
                          : ""
                      }
                

                      <!-- Income Section -->
                      ${
                        String(transactionType)?.toUpperCase() === "ALL" ||
                        String(transactionType)?.toUpperCase() === "INCOME"
                          ? incomeHtmlContent || ""
                          : ""
                      }

                      <!-- Expenses Section -->
                    ${
                      transactionType == "All"
                        ? expenseHtmlContent
                        : transactionType == "Expense"
                        ? expenseHtmlContent
                        : ""
                    }
                      

                      <!-- Note & Download Section -->
                      <tr>
                          <td style="padding: 0 20px 20px;">
                              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff3cd; border-radius: 6px;">
                                  <tr>
                                      <td style="padding: 15px;">
                                          <p style="margin: 0; font-size: 14px;">
                                              <strong>Note:</strong> Detailed transaction history is available in the attached ${fileFormat} file.
                                          </p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                          <td style="padding: 20px; border-top: 2px solid #eee;">
                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                      <td align="center" style="color: #666; font-size: 12px;">
                                          <p style="margin: 0 0 10px 0;">This is an automated report generated on ${new Date().toLocaleDateString()}.</p>
                                          <p style="margin: 0;">For any queries, please contact our support team.</p>
                                          <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} Montra. All rights reserved.</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>
              `;
      };

      if (fileFormat === "CSV") {
        const json2csvParser = new Parser({
          fields,
          delimiter: ",",
          quote: '"',
          header: true,
        });

        const csv = json2csvParser.parse(flattenedData);
        const fileName = `transactions_${Date.now()}.csv`;


        sendMail({
          to: user.email,
          fileName,
          html: mailContent(),
          fileContent: csv,
          fileType: "text/csv",
          subject:
            transactionType === "Expense"
              ? dateRange !== "lifeTime"
                ? `Expense Summary for last ${dateRange}`
                : "Detailed Expense Summary"
              : transactionType === "Income"
              ? dateRange !== "lifeTime"
                ? `Income Summary for last ${dateRange}`
                : "Detailed Income Summary"
              : "Detailed Transaction Summary",
        });
        // Convert CSV string to a buffer
        const csvBuffer = Buffer.from(csv, "utf-8");

        // Send CSV directly
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${fileName}`
        );

        res.send(csvBuffer);
      } else if (fileFormat === "Excel") {
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
        const fileName = `transactions_${Date.now()}.xlsx`;
       


        await sendMail({
          to: user.email,
          fileName,
          html: mailContent(),
          fileContent: excelBuffer,
          fileType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          subject:
            transactionType === "Expense"
              ? dateRange !== "lifeTime"
                ? `Expense Summary for last ${dateRange}`
                : "Detailed Expense Summary"
              : transactionType === "Income"
              ? dateRange !== "lifeTime"
                ? `Income Summary for last ${dateRange}`
                : "Detailed Income Summary"
              : "Detailed Transaction Summary",
        });
        // Set response headers
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${fileName}`
        );
        // Send the file
        res.status(200).send(excelBuffer);
      }
    } catch (err: any) {
      console.log(err?.message);

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
  async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const userId = req?._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          ?.status(404)
          .json({ success: false, message: "User not found!" });
      }
      const { transactionId } = req.body;
      const transaction = await TransactionModel.findById(transactionId);
      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found!" });
      }
      if (transaction?.document?.fileUrl) {
        deleteCloudinaryDocument(transaction?.document?.fileUrl);
      }
      // Use updateOne to unset the document field and bypass hooks
      await TransactionModel.updateOne(
        { _id: transactionId },
        { $unset: { document: "" } }
      );
      return res.status(200).json({
        success: true,
        message: "Document deleted successfully!",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
}

const Transaction = new transactionController();

export default Transaction;
