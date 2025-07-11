import cron from "node-cron";
import DeviceTokenService from "../controller/deviceTokenController";
import User from "../model/userModel";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";
import BudgetModel from "../model/budgetModel";
import moment from "moment";

// Function to schedule notifications for budget
function scheduleNotification(cronExpression: string) {
  cron.schedule(
    cronExpression,
    async () => {
      try {
        const users = await User.find({});
        const date = new Date();

        users.forEach(async (user) => {
          if (user?._id && user.notification.isBudgetAlert) {
            const budgetDetails = await BudgetModel.find({
              userId: user?._id,
              month: {
                $gte: moment(date).startOf("month"),
                $lte: moment(date).endOf("month"),
              },
            });
            if (budgetDetails?.length) {
              budgetDetails?.map(async (res) => {
                if (res?.isReceiveAlert) {
                  if (res?.spentPercent > res?.alertValue) {
                    const data = {
                      title: "🚨 Budget Usage Alert! 🚨",
                      body: "You're getting close to your budget limit 💸. Review your spending 🧐 to avoid exceeding your allocated amount 📊.",
                      data: {
                        screen: "Budget",
                      },
                    };
                                        
                    const androidConfig: AndroidConfig = {
                      notification: {
                        channelId: "budget",
                      },
                    };
                    await DeviceTokenService.notifyAllDevices(
                      user?._id,
                      data,
                      androidConfig
                    );
                  }
                }
              });
            }
          }
        });
      } catch (error) {
        console.error("Scheduled notification failed:", error);
      }
    },
    { timezone: "Asia/Kolkata", recoverMissedExecutions: false }
  );
}
const cronExpression = "* * * * *";
// const cronExpression = "30 18 * * *";
scheduleNotification(cronExpression);
