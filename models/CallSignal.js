import mongoose from "mongoose";

const callSignalSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    signalType: {
      type: String,
      enum: ["call-start", "offer", "answer", "ice", "hangup"],
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

callSignalSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.models.CallSignal ||
  mongoose.model("CallSignal", callSignalSchema);
