import express, { Request, Response } from "express";
import { upload } from "../lib/upload";
import Transaction from "../controller/transactionControllers";

export const transactionRouter = express.Router();
transactionRouter.post(
  "/add-transaction",
  upload.single("file"),
  Transaction.addTransaction
);

transactionRouter.post(
  "/update-transaction",
  upload.single("file"),
  Transaction.updateTransaction
);

transactionRouter.post("/get-transactions", Transaction.getAllTransaction);
transactionRouter.post("/delete-transaction", Transaction.deleteTransaction);
transactionRouter.get("/get-category", Transaction.getTransactionCategory);
transactionRouter.post("/add-category", Transaction.addNewTransactionCategory);
