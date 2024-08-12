import express, { Request, Response } from "express";
import Account from "../controller/accountController";

export const accountRouter = express.Router();

export interface AuthRequest extends Request {
  _id?: string;
}

accountRouter.post("/add-new-transaction-account", Account.addBankAccount);
accountRouter.get("/get-wallet-list", Account.getWalletList);
accountRouter.get("/get-account-balance", Account.getAccountBalance);
