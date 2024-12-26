import admin from "firebase-admin";
import cron from "node-cron";
import DeviceTokenService from "../controller/deviceTokenController";
import User from "../model/userModel";
import quotes from "../constant/quotes.json";
import notifications from "../constant/notificationCategory.json";
import { getRandomItem } from "../lib/functions";
import {
  AndroidConfig,
  AndroidNotification,
} from "firebase-admin/lib/messaging/messaging-api";

// Function to create combined notification
function createNotification() {
  // Get random quote
  const randomQuote = getRandomItem(quotes.quotes);

  // Get random notification category
  const randomCategory = getRandomItem(notifications.notifications);

  // Get random title from that category
  const randomNotificationTitle = getRandomItem(randomCategory.titles);

  return {
    title: randomNotificationTitle.title,
    body: `${randomQuote.quote} - ${randomQuote.author}`,
    category: randomCategory.category,
  };
}

// Function to schedule notifications
function scheduleNotification(cronExpression: string) {
  cron.schedule(
    cronExpression,
    async () => {
      try {
        const users = await User.find({});

        const { body, category, title } = createNotification();
        users.forEach(async (user) => {
          if (user?._id && user.notification.isTipsAndArticles) {
            const data = {
              title: title,
              body: body,
              data: {
                category,
                screen: "FinanceReport",
              },
            };
            const androidConfig: AndroidConfig = {
              notification: {
                channelId: "tips&articles",
              },
            };
            await DeviceTokenService.notifyAllDevices(
              user?._id,
              data,
              androidConfig
            );
          }
        });
      } catch (error) {
        console.error("Scheduled notification failed:", error);
      }
    },
    { timezone: "Asia/Kolkata", recoverMissedExecutions: false }
  );
}
// const cronExpression = "* * * * *";
const cronExpression = "0 17 * * *";
scheduleNotification(cronExpression);

const scheduleDeactivateAccount = async (cronExpression: string) => {
  cron.schedule(
    cronExpression,
    async () => {
      const users = await User?.find({
        isActive: false,
      });
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      if (users) {
        users.forEach(async (user) => {
          if (user?._id && !user?.isActive) {
            const userData = await User?.findOneAndDelete({
              _id: user?._id,
              isActive: false,
              deactivatedAt: { $lte: fourteenDaysAgo },
            });
            console.log(userData);
          }
        });
      }
    },
    {
      timezone: "Asia/Kolkata",
      recoverMissedExecutions: false,
    }
  );
};

const cronExp = "0 0 * * *";
scheduleDeactivateAccount(cronExp);
