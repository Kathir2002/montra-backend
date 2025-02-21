import express, { Request, Response } from "express";
import Account from "../controller/accountController";
import { upload } from "../lib/upload";

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
accountRouter.post("/logout-user", Account.logoutHander);
accountRouter.get(
  "/get-notification-preferences",
  Account.getUserNotificationPreference
);
accountRouter.post(
  "/update-user-details",
  upload.single("file"),
  Account.updateUserDetails
);

accountRouter.delete("/deactivate-account", Account.deactiveAccount);
