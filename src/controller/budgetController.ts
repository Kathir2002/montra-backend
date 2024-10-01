import { Response } from "express";
import { AuthRequest } from "../middleware/verifyToken";
import BudgetModel from "../model/budgetModel";
import moment from "moment";
import { cleanData } from "../lib/functions";

class budgetController {
  async addBudget(req: AuthRequest, res: Response) {
    try {
      const user = req._id;
      const { category, budget, month, isReceiveAlert, alertValue } = req?.body;
      const newBudget = new BudgetModel({
        userId: user,
        budget: budget,
        category: category,
        month: month,
        alertValue: alertValue,
        isReceiveAlert: isReceiveAlert,
      });
      const save = await newBudget.save();

      if (save) {
        return res
          .status(200)
          .json({ success: true, message: `Budget added successfully` });
      } else {
        return res.status(500).json({
          success: false,
          message: "Error in adding new budget",
        });
      }
    } catch (err: any) {
      console.log(err);

      return res.status(500).json({ message: err?.message, success: false });
    }
  }
  async getBudgetList(req: AuthRequest, res: Response) {
    try {
      const { filterDate }: any = req?.query;

      const user = req._id;
      const budgetList = await BudgetModel.find({
        userId: user,
        month: {
          $gte: moment(new Date(filterDate)).startOf("month"),
          $lte: moment(new Date(filterDate)).endOf("month"),
        },
      });
      if (budgetList) {
        return res
          .status(200)
          .json({ success: true, rows: cleanData(budgetList) });
      }
    } catch (err: any) {
      // console.log(err);

      return res.status(500).json({ message: err?.message, success: false });
    }
  }
  async deleteBudget(req: AuthRequest, res: Response) {
    try {
      const { budgetId } = req.body;
      if (!budgetId) {
        return res.status(401).json({
          message: "Budget id is required to delete transaction",
          success: false,
        });
      }
      const budget = await BudgetModel.findByIdAndDelete(budgetId);
      if (!budget) {
        return res
          .status(404)
          .json({ message: "Budget not found", success: false });
      }
      return res
        ?.status(200)
        ?.json({ message: "Budget deleted successfully", success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message, success: false });
    }
  }
  async updateBudget(req: AuthRequest, res: Response) {
    try {
      const { category, budget, isReceiveAlert, alertValue, budgetId } =
        req.body;
      if (!budgetId) {
        return res.status(401).json({
          message: "Budget id is required to delete transaction",
          success: false,
        });
      }
      await BudgetModel.findByIdAndUpdate(budgetId, {
        alertValue: alertValue,
        category: category,
        budget: budget,
        isReceiveAlert: isReceiveAlert,
      });
      return res
        .status(200)
        .json({ message: "Budget updated successfully", success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message, success: false });
    }
  }
}

const Budget = new budgetController();

export default Budget;
