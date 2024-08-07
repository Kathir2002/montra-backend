import express, { Request, Response } from "express";
import { upload } from "../lib/upload";
import Transaction from "../controller/transactionControllers";

export const transactionRouter = express.Router();
transactionRouter.post(
  "/add-transaction",
  upload.single("file"),
  Transaction.addTransaction
);

transactionRouter.post("/get-transactions", Transaction.getAllTransaction);
