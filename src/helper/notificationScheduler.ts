import cron from "node-cron";
import DeviceTokenService from "../controller/deviceTokenController";
import User, { IUserSchema } from "../model/userModel";
import quotes from "../constant/quotes.json";
import notifications from "../constant/notificationCategory.json";
import {
  getRandomItem,
  IPushNotificationPayload,
  sendMail,
} from "../lib/functions";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";
import moment from "moment";
import AccountBalance from "../model/accountBalance";
import AccountModel from "../model/accountModel";
import BudgetModel from "../model/budgetModel";
import DeviceToken from "../model/deviceFCMTokenModel";
import TransactionModel from "../model/transactionModel";
import mongoose from "mongoose";
import { deleteCloudinaryDocument } from "../lib/upload";

interface UserSchema extends IUserSchema {
  _id: mongoose.Types.ObjectId;
}

const notifyUserAccountDeletion = async (
  userData: UserSchema,
  deletionDate: Date
) => {
  sendMail({
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Account Deletion Confirmation</title>
<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333333;
  margin: 0;
  padding: 0;
}

.email-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background-color: #7F3DFF;
  padding: 20px;
  text-align: center;
  border-radius: 5px 5px 0 0;
}

.content {
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
}

.footer {
  background-color: #f8f9fa;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #6c757d;
  border-radius: 0 0 5px 5px;
}

.farewell {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}
</style>
</head>

<body>
<div class="email-container">
<div class="header">
  <h1 style="color: #FFFFFF;">Account Deletion Confirmation</h1>
</div>
<div class="content">
  <p>Hello ${userData?.name},</p>

  <p>This email confirms that your account and all associated data have been permanently deleted from our
      systems as of ${moment(deletionDate).format("DD MMM YYYY")}.</p>

  <div class="farewell">
      <p>We're sorry to see you go. If you decide to return in the future, you're always welcome to create a
          new account.</p>
  </div>

  <p>If you believe this was done in error or have any questions, please contact our support team:</p>
  <a href="mailto:montra.service@gmail.com">montra.service@gmail.com</a>

  <p>Thank you for being part of our community. We wish you all the best!</p>
</div>
<div class="footer">
  <p>This email was sent by <b>Montra</b></p>
  <p>This is a one-time notification and no response is required.</p>
</div>
</div>
</body>

</html>`,
    subject: "Your Account Has Been Successfully Deleted - Goodbye from Montra",
    to: userData?.email!,
  });
  const data: IPushNotificationPayload = {
    title: "Goodbye from Montra 👋",
    body: "Account deletion complete. We hope to see you again in the future!",
    data: {
      screen: "",
    },
  };
  const androidConfig: AndroidConfig = {
    notification: {
      channelId: "account",
    },
  };
  await DeviceTokenService.notifyAllDevices(
    userData?._id!,
    data,
    androidConfig
  );
  await DeviceToken.findOneAndDelete({
    user: userData?._id,
  })
    .then(async () => {
      console.log("Account successfuly deleted!");
    })
    .catch((err) => {
      console.log(
        "Error in deleting Device Token Model for the user",
        err?.message
      );
    });
};

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
const cronExpression = "0 17 * * *";
scheduleNotification(cronExpression);

const deletableRemaingData = async (
  userData: UserSchema,
  deletionDate: Date
) => {
  await AccountBalance.findOneAndDelete({ userId: userData?._id })
    .then(async () => {
      await AccountModel.findOneAndDelete({
        user: userData?._id,
      })
        .then(async () => {
          const budgetData = await BudgetModel.find({
            userId: userData?._id,
          });
          if (budgetData.length) {
            await BudgetModel.findOneAndDelete({
              userId: userData?._id,
            })
              .then(async () => {
                await notifyUserAccountDeletion(userData!, deletionDate);
              })
              .catch((err) => {
                console.log(
                  "Error in deleting Budget Model for the user",
                  err?.message
                );
              });
          } else {
            await notifyUserAccountDeletion(userData!, deletionDate);
          }
        })
        .catch((err) => {
          console.log(
            "Error in deleting Account Model for the user",
            err?.message
          );
        });
    })
    .catch((err) => {
      console.log(
        "Error in deleting Account Balance Model for user",
        err?.message
      );
    });
};

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
            if (userData?.picture) {
              deleteCloudinaryDocument(userData?.picture);
            }
            const deletionDate = new Date(
              userData?.deactivatedAt!?.getTime() + 14 * 24 * 60 * 60 * 1000
            );
            const transactionData = await TransactionModel.find({
              user: userData?._id,
            });
            if (transactionData.length) {
              transactionData?.map(async (transactionDatum) => {
                if (transactionDatum?.document?.fileUrl) {
                  await deleteCloudinaryDocument(
                    transactionDatum?.document?.fileUrl
                  );
                }
              });
              await TransactionModel.deleteMany({
                user: userData?._id,
              })
                .then(async () => {
                  await deletableRemaingData(
                    userData as UserSchema,
                    deletionDate
                  );
                })
                .catch((err) => {
                  console.log(
                    "Error in deleting Transactions Model for the user",
                    err?.message
                  );
                });
            } else {
              await deletableRemaingData(userData as UserSchema, deletionDate);
            }
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
