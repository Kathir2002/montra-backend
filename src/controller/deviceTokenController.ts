import mongoose from "mongoose";
import DeviceToken, { IToken } from "../model/deviceFCMTokenModel";
import {
  IPushNotificationPayload,
  sendPushNotification,
} from "../lib/functions";
import { AndroidConfig } from "firebase-admin/lib/messaging/messaging-api";

interface IAdditionalInfo {
  platform: "ios" | "Android" | "web" | "desktop";
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  appId: string;
  ipAddress: string;
  manufacturer: string;
}
class DeviceTokenService {
  // Register device token with comprehensive device info
  static async registerDeviceToken(
    userId: mongoose.Types.ObjectId,
    fcmToken: string,
    additionalInfo: IAdditionalInfo
  ) {
    try {
      // Collect comprehensive device information
      const deviceInfo: IToken = {
        platform: additionalInfo.platform,
        appId: additionalInfo.appId || "default",
        deviceInfo: {
          deviceModel: additionalInfo.deviceModel,
          osVersion: additionalInfo.osVersion,
          appVersion: additionalInfo.appVersion,
          manufacturer: additionalInfo.manufacturer,
        },
        loginMetadata: {
          ipAddress: additionalInfo.ipAddress,
        },
      };

      // Register or update device token
      return await DeviceToken.registerDeviceToken(
        userId,
        fcmToken,
        deviceInfo
      );
    } catch (error) {
      console.error("Failed to register device token:", error);
      throw error;
    }
  }

  // Logout from specific device
  static async logoutDevice(userId: mongoose.Types.ObjectId, fcmToken: string) {
    return await DeviceToken.logoutToken(userId, fcmToken);
  }

  // Logout from all devices
  static async logoutAllDevices(userId: mongoose.Types.ObjectId) {
    return await DeviceToken.logoutAllTokens(userId);
  }

  // Get active device tokens for a user
  static async getActiveDevices(userId: mongoose.Types.ObjectId) {
    const activeTokens = await DeviceToken.getActiveTokens(userId);

    return activeTokens.map((token: IToken) => ({
      fcmToken: token.fcmToken,
      platform: token.platform,
      appId: token.appId,
      deviceModel: token.deviceInfo?.deviceModel,
      lastActiveAt: token.lastActiveAt,
    }));
  }

  // Send notifications to all active devices
  static async notifyAllDevices(
    userId: mongoose.Types.ObjectId,
    notificationPayload: IPushNotificationPayload,
    android: AndroidConfig
  ) {
    const activeTokens = await DeviceToken.getActiveTokens(userId);

    const notificationPromises = activeTokens.map(async (token: IToken) => {
      try {
        await sendPushNotification(
          notificationPayload,
          token?.fcmToken!,
          userId,
          android
        );
      } catch (error) {
        console.error(
          `Failed to send notification to token ${token.fcmToken}`,
          error
        );
      }
    });

    await Promise.allSettled(notificationPromises);
  }
}

export default DeviceTokenService;
