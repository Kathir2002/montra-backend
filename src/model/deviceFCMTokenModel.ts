import mongoose, { Model } from "mongoose";
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
          unique: true,
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

// Define static methods
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

  getActiveTokens(userId: mongoose.Types.ObjectId): Promise<IToken[]>;

  logoutAllTokens(userId: mongoose.Types.ObjectId): Promise<boolean>;
}

// Compound index for efficient querying
DeviceTokenSchema.index(
  {
    user: 1,
    "tokens.fcmToken": 1,
  },
  { unique: true }
);

// Static method to register or update device token
DeviceTokenSchema.statics.registerDeviceToken = async function (
  userId,
  fcmToken,
  deviceInfo = {}
) {
  try {
    // Find or create device token document for the user
    let deviceTokenDoc = await this.findOne({ user: userId });

    if (!deviceTokenDoc) {
      deviceTokenDoc = new this({
        user: userId,
        tokens: [],
      });
    }

    // Check if token already exists
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

    // Save the document
    await deviceTokenDoc.save();

    return deviceTokenDoc;
  } catch (error: any) {
    console.error("Error registering device token:", error?.message);
    throw error;
  }
};

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

const DeviceToken = mongoose.model<IDeviceTokenSchema, DeviceTokenModel>(
  "DeviceToken",
  DeviceTokenSchema
);

export default DeviceToken;
