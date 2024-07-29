import express, { Request, Response } from "express";
import Expense from "../controller/expenseControllers";
import { upload } from "../lib/upload";

export const TransactionRouter = express.Router();
TransactionRouter.post(
  "/add-expense",
  upload.single("file"),
  Expense.addExpense
);
