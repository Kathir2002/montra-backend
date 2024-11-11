import { Response } from "express";
import { AuthRequest } from "../routes/authRoute";
import User from "../model/userModel";
import { cleanData } from "../lib/functions";
import AccountModel from "../model/accountModel";
import AccountBalance from "../model/accountBalance";
import TransactionModel from "../model/transactionModel";
import mongoose from "mongoose";
import moment from "moment";
const ObjectId = mongoose.Types.ObjectId;

class accountController {
  async addBankAccount(req: AuthRequest, res: Response) {
    try {
      const { name, provider, accountType, balance } = req.body;
      let user = undefined;
      let isAuthenticated = false;
      if (req._id) {
        user = await User.findById(req._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        isAuthenticated = true;
      }

      if (
        !(Object?.keys(provider)?.length > 0) ||
        name === "" ||
        accountType === ""
      ) {
        return res.status(404).json({
          message: "Please fill all necessary fields",
          success: false,
        });
      }
      if (user?.account) {
        const profile = await AccountModel.findById(user.account);
        profile?.bankAccounts.push({
          accountType: accountType,
          balance: balance,
          provider: provider,
          name: name,
        });
        await profile?.save();
      } else {
        const profileData: any = await AccountModel.create({
          user: user?._id,
          bankAccounts: [
            {
              balance: balance,
              name: name,
              accountType: accountType,
              provider: provider,
            },
          ],
        });

        if (isAuthenticated && user) {
          user.account = profileData?._id;
          user.isSetupDone = true;
          await user.save();
        }
      }

      return res
        .status(200)
        .json({ message: "User profile created successfully!", success: true });
    } catch (err: any) {
      console.log(err);

      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async updateBankAccount(req: AuthRequest, res: Response) {
    try {
      const { name, provider, accountType, balance, walletId } = req.body;
      const userId = req._id;

      const profile: any = await AccountModel.findOne({ user: userId });
      if (!profile) {
        return res
          .status(404)
          .json({ message: "User profile not found", success: false });
      }
      const bankAccount = profile?.bankAccounts?.id(walletId);

      if (provider) bankAccount.provider = provider;
      if (balance) bankAccount.balance = balance;
      if (name) bankAccount.name = name;
      if (accountType) bankAccount.accountType = accountType;

      const newTotalBalance = profile.bankAccounts.reduce(
        (sum: number, acc: any) => sum + acc.balance,
        0
      );

      // Update totalAccountBalance
      profile.totalAccountBalance = newTotalBalance;
      await profile.save();

      if (balance) {
        await AccountBalance.findOneAndUpdate(
          { userId: new ObjectId(userId) },
          {
            $set: {
              balance: newTotalBalance,
            },
          }
        );
      }

      return res
        .status(200)
        .json({ message: "User profile updated successfully!", success: true });
    } catch (err: any) {
      console.log(err);

      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async deleteBankAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const { bankAccountId, wallet } = req.body;

      if (!bankAccountId) {
        return res.status(401).json({
          message: "Bank account id is required to delete bank account",
          success: false,
        });
      }
      const ObjectId = mongoose.Types.ObjectId;

      const accountDoc: any = await AccountModel.findOne({
        user: new ObjectId(userId),
      });

      if (accountDoc && accountDoc.bankAccounts.length > 0) {
        const accountBalanceToDelete =
          accountDoc.bankAccounts?.id(bankAccountId)?.balance;

        const accountData = await AccountModel.findOneAndUpdate(
          { user: new ObjectId(userId) },
          {
            $pull: {
              bankAccounts: { _id: new ObjectId(bankAccountId) }, // Match the bank account to remove by its _id
            },
            $inc: {
              totalAccountBalance: -accountBalanceToDelete,
            },
          }
        );
        if (accountData) {
          await AccountBalance.updateOne(
            {
              userId: userId,
            },
            {
              $inc: {
                balance: -accountBalanceToDelete,
              },
            }
          );
        }
        return res.status(200).json({
          success: true,
          message: "Bank account deleted successfully",
        });
      } else {
        return res
          .status(404)
          .json({ message: "Bank account not found", success: false });
      }
    } catch (err: any) {
      console.log(err);
      res.status(500).json({ message: err?.message, success: false });
    }
  }
  async getWalletList(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const walletList: any = await User.findById(userId).populate({
        path: "account",
      });

      const walletData = await cleanData(walletList?.account?.bankAccounts);

      return res.status(200).json({
        rows: walletData,
        totalAccountBalance: walletList?.account?.totalAccountBalance,
        success: true,
      });
    } catch (err: any) {
      console.log(err);

      res.status(500).json({ message: err?.message, success: false });
    }
  }

  async getAccountBalance(req: AuthRequest, res: Response) {
    try {
      const { month }: any = req.query;

      const userId = req._id;
      const data = await AccountBalance.find({
        userId: userId,
        createdAt: {
          $gte: moment(month).startOf("month"),
          $lte: moment(month).endOf("month"),
        },
      });

      if (data.length === 0) {
        return res.status(200).json({
          success: true,
          balanceData: { totalExpenses: 0, totalIncome: 0, balance: 0 },
        });
      }
      const balanceData = await cleanData(data);

      return res
        .status(200)
        .json({ success: true, balanceData: balanceData[0] });
    } catch (err: any) {
      console.log(err);

      return res.status(500).json({ success: false, message: err?.message });
    }
  }

  async getWeeklyTransactions(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const { transactionType, weekStartDate, weekEndDate } = req.body;

      const transactionData = await TransactionModel.aggregate([
        // Match transactions within the date range, transaction type as 'Expense', and for the specific user
        {
          $match: {
            user: new ObjectId(userId),
            transactionType: transactionType,
            transactionDate: {
              $gte: new Date(weekStartDate),
              $lte: new Date(weekEndDate),
            },
          },
        },
        // Group by day of the week
        {
          $group: {
            _id: { $dayOfWeek: "$transactionDate" }, // Groups by the day of the week (1=Sunday, 2=Monday, ...)
            totalAmount: { $sum: "$amount" },
            dayOfWeek: { $first: "$transactionDate" }, // To retain the date for formatting later
          },
        },
        // Add a field for the day abbreviation
        {
          $addFields: {
            day: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", 1] }, then: "Sun" },
                  { case: { $eq: ["$_id", 2] }, then: "Mon" },
                  { case: { $eq: ["$_id", 3] }, then: "Tue" },
                  { case: { $eq: ["$_id", 4] }, then: "Wed" },
                  { case: { $eq: ["$_id", 5] }, then: "Thu" },
                  { case: { $eq: ["$_id", 6] }, then: "Fri" },
                  { case: { $eq: ["$_id", 7] }, then: "Sat" },
                ],
                default: "Unknown",
              },
            },
          },
        },
        // Optionally, sort by day of the week if needed
        {
          $sort: { _id: 1 }, // Sorts by day of the week (1=Sunday, 7=Saturday)
        },
        // Optionally project to remove the _id field if it's not needed
        {
          $project: {
            _id: 0,
            day: 1,
            totalAmount: 1,
          },
        },
      ]);

      return res
        .status(200)
        .json({ transactionData: transactionData, success: true });
    } catch (err: any) {
      console.log(err?.message);

      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async changeUserPreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const { currency, notification, securityMethod } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      if (currency) {
        user.currency = currency;
        await user.save();
        return res.status(200).json({
          success: true,
          message: "Currency symbol updated successfully",
        });
      }
      if (notification) {
        const { isExpenseAlert, isBudgetAlert, isTipsAndArticles } =
          notification;

        if (isTipsAndArticles || typeof isTipsAndArticles == "boolean") {
          user.notification.isTipsAndArticles = isTipsAndArticles;
        } else if (isExpenseAlert || typeof isExpenseAlert == "boolean") {
          user.notification.isExpenseAlert = isExpenseAlert;
        } else if (isBudgetAlert || typeof isBudgetAlert == "boolean") {
          user.notification.isBudgetAlert = isBudgetAlert;
        }
        await user.save();
        return res.status(200).json({
          success: true,
          notification: user?.notification,
          message: "Notification preferences updated successfully",
        });
      }
      if (securityMethod) {
        user.securityMethod = securityMethod;
        await user.save();
        return res.status(200).json({
          success: true,
          message: "Security method updated successfully",
        });
      }
    } catch (err: any) {
      console.log(err);

      return res.status(500).json({ success: false, message: err?.message });
    }
  }
  async getUserNotificationPreference(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.status(200).json({
        success: true,
        notification: user.notification,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  }
}

const Account = new accountController();

export default Account;
