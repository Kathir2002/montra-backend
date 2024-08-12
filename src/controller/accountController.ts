import { Request, Response } from "express";
import { AuthRequest } from "../routes/authRoute";
import User from "../model/userModel";
import { cleanData } from "../lib/functions";
import AccountModel from "../model/accountModel";
import AccountBalance from "../model/accountBalance";

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
        const data = await profile?.save();
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
  async getWalletList(req: AuthRequest, res: Response) {
    try {
      const userId = req._id;
      const walletList: any = await User.findById(userId).populate({
        path: "account",
      });

      const walletData = await cleanData(walletList?.account?.bankAccounts);

      return res.status(200).json({ rows: walletData, success: true });
    } catch (err: any) {
      console.log(err);

      res.status(500).json({ message: err?.message, success: false });
    }
  }

  async getAccountBalance(req: AuthRequest, res: Response) {
    try {
      const { month, year }: any = req.query;

      const userId = req._id;
      const data = await AccountBalance.find({
        userId: userId,
        month: month,
        year: year,
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
}

const Account = new accountController();

export default Account;
