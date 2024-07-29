import express, { Request, Response } from "express";
import Expense from "../controller/expenseControllers";

export const ExpenseRouter = express.Router();

ExpenseRouter.post("/add-expense", Expense.addExpense);
