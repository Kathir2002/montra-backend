import mongoose from "mongoose";

export interface IContactSupportSchema {
  user: mongoose.Types.ObjectId;
  request_id: string;
  subject: string;
  message: string;
  userImage: string;
  name: string;
  phoneNumber: number;
  email: string;
  document:
    | {
        fileName: string;
        fileUrl: string;
        fileFormat: string;
        fileSize: number;
      }
    | undefined;
  isActive: boolean;
  request_Date: Date;
  status: "New" | "Progress" | "Resolved";
  priority: "Low" | "Medium" | "High";
  replies: IReply[];
}
[];

export interface IReply {
  sender: mongoose.Types.ObjectId;
  role: "Admin" | "User";
  text: string;
  status?: "sent" | "read";
  createdAt: Date;
  _id?: mongoose.Types.ObjectId;
  replyTo?: any;
  senderName: string;
  // replyTo?: mongoose.Types.ObjectId | null;
}

const contactSupportSchema = new mongoose.Schema<IContactSupportSchema>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    request_id: {
      type: String,
      trim: true,
      required: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    userImage: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: Number,
      trim: true,
      required: true,
    },
    document: {
      fileUrl: {
        type: String,
      },
      fileName: {
        type: String,
        required: function () {
          return (
            this?.document && this.document?.fileUrl?.startsWith("https://")
          );
        },
      },
      fileFormat: {
        type: String,
        required: function () {
          return (
            this?.document && this.document?.fileUrl?.startsWith("https://")
          );
        },
      },
      fileSize: {
        type: Number,
        required: function () {
          return (
            this?.document && this.document?.fileUrl?.startsWith("https://")
          );
        },
      },
    },
    email: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      trim: true,
      required: true,
      default: "New",
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    request_Date: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      default: "High",
    },
    replies: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Can be a user or an admin
          required: true,
        },
        role: {
          type: String,
          enum: ["User", "Admin"],
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        senderName: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        replyTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ContactSupport.replies",
          default: null,
        },
        status: {
          type: String,
          default: "sent",
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const ContactSupportModel = mongoose.model(
  "ContactSupport",
  contactSupportSchema
);
export default ContactSupportModel;
