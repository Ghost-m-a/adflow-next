import mongoose, { Schema, type Model } from "mongoose";

/**
 * Records how a single conversion's reward is split among creators.
 * For last-click attribution, there's one credit. For linear, there
 * are N credits (one per touch) whose amounts sum to the conversion.
 */
export interface ConversionCreditDocument extends mongoose.Document {
  conversionId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  clickEventId: mongoose.Types.ObjectId;
  weight: number;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionCreditSchema = new Schema<ConversionCreditDocument>(
  {
    conversionId: {
      type: Schema.Types.ObjectId,
      ref: "Conversion",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clickEventId: {
      type: Schema.Types.ObjectId,
      ref: "ClickEvent",
      required: true,
    },
    weight: { type: Number, required: true, min: 0, max: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
  },
  { timestamps: true, versionKey: false },
);

ConversionCreditSchema.index({ conversionId: 1, creatorId: 1 });
ConversionCreditSchema.index({ creatorId: 1, createdAt: -1 });

const ConversionCredit: Model<ConversionCreditDocument> =
  (mongoose.models.ConversionCredit as
    | Model<ConversionCreditDocument>
    | undefined) ??
  mongoose.model<ConversionCreditDocument>(
    "ConversionCredit",
    ConversionCreditSchema,
  );

export default ConversionCredit;
