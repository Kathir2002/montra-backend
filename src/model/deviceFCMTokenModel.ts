import mongoose, { Model } from "mongoose";

interface DeviceTokenModel extends Model<IDeviceTokenSchema> {
  registerDeviceToken(
    userId: mongoose.Types.ObjectId,
    fcmToken: string,
    deviceInfo: Partial<IToken>
  ): Promise<IDeviceTokenSchema>;

  logoutToken(
    userId: mongoose.Types.ObjectId,
    fcmToken: string
  ): Promise<boolean>;
  deleteToken(
    userId: mongoose.Types.ObjectId,
    fcmToken: string
  ): Promise<boolean>;

  getActiveTokens(userId: mongoose.Types.ObjectId): Promise<IToken[]>;

  logoutAllTokens(userId: mongoose.Types.ObjectId): Promise<boolean>;

  transferToken(
    fcmToken: string,
    fromUserId: mongoose.Types.ObjectId,
    toUserId: mongoose.Types.ObjectId
  ): Promise<boolean>;
}
interface IDeviceInfo {
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  manufacturer: string;
}

export interface IToken {
  fcmToken?: string;
  platform: "ios" | "Android" | "web" | "desktop";
  appId: string;
  deviceInfo: IDeviceInfo;
  lastActiveAt?: Date;
  isActive?: boolean;
  loginMetadata: {
    ipAddress: string;
  };
}

export interface IDeviceTokenSchema {
  user: mongoose.Types.ObjectId;
  tokens: IToken[];
}

const DeviceTokenSchema = new mongoose.Schema<IDeviceTokenSchema>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokens: [
      {
        fcmToken: {
          type: String,
          required: true,
        },
        platform: {
          type: String,
          enum: ["ios", "Android", "web", "desktop"],
          required: true,
        },
        appId: {
          type: String,
          default: "default",
        },
        deviceInfo: {
          deviceModel: String,
          osVersion: String,
          appVersion: String,
          manufacturer: String,
        },
        lastActiveAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        loginMetadata: {
          ipAddress: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Remove the unique constraint from the compound index
DeviceTokenSchema.index({
  user: 1,
  "tokens.fcmToken": 1,
});

// Static method to logout specific token
DeviceTokenSchema.statics.logoutToken = async function (userId, fcmToken) {
  const deviceTokenDoc = await this.findOne({ user: userId });

  if (deviceTokenDoc) {
    const tokenIndex = deviceTokenDoc.tokens.findIndex(
      (token: IToken) => token.fcmToken === fcmToken
    );

    if (tokenIndex !== -1) {
      deviceTokenDoc.tokens[tokenIndex].isActive = false;
      deviceTokenDoc.tokens[tokenIndex].lastActiveAt = new Date();

      await deviceTokenDoc.save();
      return true;
    }
  }

  return false;
};

// Static method to delete inactive fcm token
DeviceTokenSchema.statics.deleteToken = async function (userId, fcmToken) {
  const deviceTokenDoc = await this.findOne({ user: userId });

  if (deviceTokenDoc) {
    deviceTokenDoc.tokens = deviceTokenDoc.tokens.filter(
      (token: IToken) => token.fcmToken !== fcmToken
    );

    await deviceTokenDoc.save();
    return true;
  }

  return false;
};

// Static method to get active tokens
DeviceTokenSchema.statics.getActiveTokens = async function (userId) {
  const deviceTokenDoc = await this.findOne({ user: userId });

  return deviceTokenDoc
    ? deviceTokenDoc.tokens.filter((token: IToken) => token.isActive)
    : [];
};

// Static method to logout all tokens
DeviceTokenSchema.statics.logoutAllTokens = async function (userId) {
  const deviceTokenDoc = await this.findOne({ user: userId });

  if (deviceTokenDoc) {
    deviceTokenDoc.tokens.forEach((token: IToken) => {
      token.isActive = false;
      token.lastActiveAt = new Date();
    });

    await deviceTokenDoc.save();
    return true;
  }

  return false;
};
// Modified registerDeviceToken method
DeviceTokenSchema.statics.registerDeviceToken = async function (
  userId,
  fcmToken,
  deviceInfo = {}
) {
  try {
    // First, find if this FCM token exists for any user
    const existingTokenDoc = await this.findOne({
      "tokens.fcmToken": fcmToken,
    });

    // If token exists for another user, transfer it
    if (existingTokenDoc && !existingTokenDoc.user.equals(userId)) {
      await DeviceToken.transferToken(fcmToken, existingTokenDoc.user, userId);
    }

    // Now proceed with regular registration
    let deviceTokenDoc = await this.findOne({ user: userId });

    if (!deviceTokenDoc) {
      deviceTokenDoc = new this({
        user: userId,
        tokens: [],
      });
    }

    const existingTokenIndex = deviceTokenDoc.tokens.findIndex(
      (token: IToken) => token.fcmToken === fcmToken
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      deviceTokenDoc.tokens[existingTokenIndex] = {
        ...deviceTokenDoc.tokens[existingTokenIndex],
        ...deviceInfo,
        fcmToken,
        lastActiveAt: new Date(),
        isActive: true,
      };
    } else {
      // Add new token
      deviceTokenDoc.tokens.push({
        fcmToken,
        ...deviceInfo,
        lastActiveAt: new Date(),
        isActive: true,
      });
    }

    await deviceTokenDoc.save();
    return deviceTokenDoc;
  } catch (error: any) {
    console.error("Error registering device token:", error?.message);
    throw error;
  }
};

// If you prefer this approach, just deactivate the old token and let registerDeviceToken handle the new registration.
DeviceTokenSchema.statics.transferToken = async function (
  fcmToken,
  fromUserId,
) {
  try {
    // Just deactivate token for previous user
    const previousUserDoc = await this.findOne({ user: fromUserId });
    if (previousUserDoc) {
      const tokenIndex = previousUserDoc.tokens.findIndex(
        (token: IToken) => token.fcmToken === fcmToken
      );
      if (tokenIndex !== -1) {
        previousUserDoc.tokens[tokenIndex].isActive = false;
        previousUserDoc.tokens[tokenIndex].lastActiveAt = new Date();
        await previousUserDoc.save();
      }
    }

    return true;
  } catch (error: any) {
    console.error("Error transferring token:", error?.message);
    throw error;
  }
};

const DeviceToken = mongoose.model<IDeviceTokenSchema, DeviceTokenModel>(
  "DeviceToken",
  DeviceTokenSchema
);

export default DeviceToken;
