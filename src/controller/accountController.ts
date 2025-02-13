import { Response } from "express";
import { AuthRequest } from "../routes/authRoute";
import User from "../model/userModel";
import {
  cleanData,
  IPushNotificationPayload,
  MailOptionsInterface,
  sendMail,
} from "../lib/functions";
import AccountModel from "../model/accountModel";
import AccountBalance from "../model/accountBalance";
import TransactionModel from "../model/transactionModel";
import mongoose from "mongoose";
import DeviceTokenService from "./deviceTokenController";
import { uploadToCloud } from "../lib/upload";
import moment from "moment";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";
import ContactSupportModel from "../model/contactSupport";
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
      const { bankAccountId } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }

      if (!bankAccountId) {
        return res.status(401).json({
          message: "Bank account id is required to delete bank account",
          success: false,
        });
      }

      const ObjectId = mongoose.Types.ObjectId;

      const transactionData = await TransactionModel?.find({
        "wallet.id": new ObjectId(bankAccountId),
      });
      if (transactionData.length > 0) {
        return res.status(400).json({
          message: "Cannot delete bank account with existing transactions",
          success: false,
        });
      }

      const accountDoc: any = await AccountModel.findOne({
        user: new ObjectId(userId),
      });

      if (accountDoc?.bankAccounts?.length === 1) {
        return res.status(400).json({
          message:
            "You need to have at least one account. This account cannot be deleted.",
          success: false,
        });
      }

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
          },
          { new: true }
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
      const monthDateObj = new Date(month);
      const userId = req._id;
      const data = await AccountBalance.find({
        userId: userId,
      });

      if (!data.length) {
        return res.status(200).json({
          success: true,
          balanceData: { totalExpenses: 0, totalIncome: 0, balance: 0 },
        });
      }

      const filterDate = new Date(
        monthDateObj.getFullYear(),
        monthDateObj.getMonth() + 1,
        0
      );
      const accountBalance = data?.find((datum) => datum?.balance)?.balance;

      const filteredData = data?.filter((datum) => {
        return datum?.month === filterDate.toISOString().slice(0, 7);
      });

      const balanceData = await cleanData(filteredData);
      let cleanedBalanceData = balanceData[0];
      if (!balanceData?.length) {
        cleanedBalanceData = {
          userId: userId,
          balance: accountBalance,
          month: filterDate.toISOString().slice(0, 7),
          totalExpenses: 0,
          totalIncome: 0,
        };
      }

      return res
        .status(200)
        .json({ success: true, balanceData: cleanedBalanceData });
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
  // Logout from specific device
  async logoutHander(req: AuthRequest, res: Response) {
    try {
      const { fcmToken } = req.body;
      const userId = req?._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      if (!fcmToken) {
        return res
          .status(400)
          .json({ success: false, message: "FCM token is required" });
      }

      const result = await DeviceTokenService.logoutDevice(userId!, fcmToken);

      if (result) {
        res.status(200).json({
          success: true,
          message: "Device logged out successfully",
        });
      } else {
        res.status(404).json({
          message: "Device token not found",
        });
      }
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to logout device",
        error: error.message,
      });
    }
  }
  async updateUserDetails(req: AuthRequest, res: Response) {
    try {
      const { name, phoneNumber } = req.body;
      const userId = req?._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      let documet: any = undefined;

      if (req.file) {
        await uploadToCloud(req, res).then((response) => {
          documet = response;
        });
      }

      const data = await User.findByIdAndUpdate(
        userId,
        {
          name: name,
          picture: documet?.fileUrl,
          phoneNumber: phoneNumber,
        },
        { new: true }
      );

      res.status(200).json({
        data,
        success: true,
        message: "User details updated successfully",
      });
    } catch (err: any) {
      console.log(err?.message);

      res.status(500).json({ success: false, message: err?.message });
    }
  }
  async deactiveAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req?._id;
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      user.isActive = false;
      const deactivationDate = new Date();
      user.deactivatedAt = deactivationDate;
      await user.save();

      const deletionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const loginUrl = `${process.env.DEEPLINK_URL}/signin`;
      const helpCenter = `${process.env.DEEPLINK_URL}/help-center`;
      sendMail({
        html: `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deactivation Notice</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background-color: #7F3DFF;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }

        .content {
            padding: 20px;
            background-color: #ffffff;
            border: 1px solid #e9ecef;
        }

        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-radius: 0 0 5px 5px;
        }

        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }

        .warning {
            color: #dc3545;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <div class="header">
            <h1 style="color: #FFFFFF;">Account Deactivation Notice</h1>
        </div>
        <div class="content">
            <p>Hello ${user?.name},</p>

            <p>We're writing to confirm that your account has been deactivated as requested on ${moment(
              deactivationDate
            ).format("dddd D MMMM YYYY  HH:mm")}.</p>

            <p><span class="warning">Important:</span> Your account will be permanently deleted after 14 days (on
                ${moment(deletionDate).format("DD MMM YYYY")}).</p>
            <p>If you change your mind, you can reactivate your account at any time during this 14-day period by simply
                logging back in to your account.</p>
            <div style="text-align: center;">
                <a href=${loginUrl} class="button">Log In to Reactivate</a>
            </div>

            <p>If you take no action, your account and all associated data will be permanently deleted after the 14-day
                period.</p>

            <p>If you didn't request this deactivation, please contact our support team immediately:</p>
            <a href="mailto:montra.service@gmail.com">montra.service@gmail.com</a>
        </div>
        <div class="footer">
            <p>This email was sent by <b>Montra</b></p>
            <p>If you need any assistance, please visit our <a href=${helpCenter}>Help Center</a></p>
        </div>
    </div>
</body>
</html>`,
        subject:
          "Action Required: Your Account Has Been Deactivated - 14 Days to Reactivate",
        to: user?.email!,
      });

      const data: IPushNotificationPayload = {
        title: "Account Deactivated 🔒",
        body: "Your account will be deleted in 14 days. Log in now to cancel the deletion process.",
        data: {},
      };
      const androidConfig: AndroidConfig = {
        notification: {
          channelId: "account",
        },
      };
      await DeviceTokenService.notifyAllDevices(
        user?._id!,
        data,
        androidConfig
      );

      return res.status(200).json({
        message: "Account deactivated. Will be permanently deleted in 14 days.",
        success: true,
      });
    } catch (err: any) {
      return res?.status(500).json({ success: false, message: err?.message });
    }
  }
}

const Account = new accountController();

export default Account;
