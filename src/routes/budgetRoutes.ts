import express from "express";
import Budget from "../controller/budgetController";

export const budgetRouter = express.Router();

budgetRouter.get("/get-budget", Budget.getBudgetList);
budgetRouter.post("/add-budget", Budget.addBudget);
budgetRouter.post("/update-budget", Budget.updateBudget);
budgetRouter.post("/delete-budget", Budget.deleteBudget);
