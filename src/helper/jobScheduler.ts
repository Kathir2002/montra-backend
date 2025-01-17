import cron from "node-cron";

import TransactionModel, {
  ITransactionSchema,
} from "../model/transactionModel";
import User from "../model/userModel";
import Transaction from "../controller/transactionControllers";
import { Response } from "express";

const getUser = async () => {
  const users = await User.find({});
  users.forEach(async (user) => {
    if (user?._id) {
      const transactions = await TransactionModel.find({
        user: user._id,
        transactionType: { $in: ["Expense", "Income"] },
      });

      transactions.forEach((transaction) => {
        if (
          transaction?.isRepeat &&
          new Date(transaction?.endAfter) >= new Date()
        ) {
          let cronExpression = null;
          if (transaction.frequency.frequencyType == "daily") {
            cronExpression = `0 0 * * *`;
          } else if (transaction.frequency.frequencyType == "weekly") {
            cronExpression = `0 0 * * ${transaction?.frequency?.day}`;
          } else if (transaction.frequency.frequencyType == "monthly") {
            cronExpression = `0 0 ${transaction.frequency.date} * *`;
          } else if (transaction.frequency.frequencyType == "yearly") {
            cronExpression = `0 0 ${transaction.frequency.date} ${transaction?.frequency?.month} *`;
          }
          if (cronExpression !== null) {
            cron.schedule(
              cronExpression,
              () => {
                const req = {
                  body: {
                    user: transaction?.user,
                    isRepeat: transaction?.isRepeat,
                    // endAfter: transaction?.endAfter,
                    amount: transaction?.amount,
                    transactionFor: transaction?.transactionFor,
                    wallet: transaction?.wallet?.id,
                    description: transaction?.description,
                    // frequency: JSON.stringify(transaction?.frequency),
                    type: transaction?.transactionType,
                    paymentMode: transaction?.paymentMode,
                    transactionDate: new Date(),
                    notes: transaction?.notes,
                  },
                  _id: transaction?.user,
                };

                // Prepare a mock response object to call addTransaction
                const res = {
                  status: (code: number) => ({
                    json: (data: ITransactionSchema) =>
                      console.log(`Response Code: ${code}`),
                  }),
                };
                Transaction.addTransaction(req as any, res as Response);
              },
              { timezone: "Asia/Kolkata", recoverMissedExecutions: false }
            );
          }
        }
      });
    }
  });
};
getUser();
