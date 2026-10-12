import mongoose, { Model, Schema } from "mongoose";

export type NotificationType =
  | "campaign"
  | "application"
  | "payment"
  | "organization"
  | "system";

export interface INotification {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["campaign", "application", "payment", "organization", "system"],
      default: "system",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    href: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification =
  (mongoose.models.Notification as Model<INotification> | undefined) ??
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
