import express, { Request, Response } from "express";
import Account from "../controller/accountController";

export const accountRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: string;
}

accountRouter.post("/add-new-bank-account", Account.addBankAccount);
accountRouter.post("/update-bank-account", Account.updateBankAccount);
accountRouter.post("/delete-bank-account", Account.deleteBankAccount);
accountRouter.get("/get-wallet-list", Account.getWalletList);
accountRouter.get("/get-account-balance", Account.getAccountBalance);
accountRouter.post("/get-weekly-transactions", Account.getWeeklyTransactions);
accountRouter.post("/change-preferences", Account.changeUserPreferences);
accountRouter.get(
  "/get-notification-preferences",
  Account.getUserNotificationPreference
);
