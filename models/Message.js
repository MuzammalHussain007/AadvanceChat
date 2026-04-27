import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderAvatar: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      default: "",
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "voice", "emoji", "location", "video", "call"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    voiceDuration: {
      type: Number,
      default: null,
    },
    videoDuration: {
      type: Number,
      default: null,
    },
    readBy: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        readAt: Date,
      },
    ],
    deliveredTo: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        deliveredAt: Date,
      },
    ],
    editedAt: {
      type: Date,
      default: null,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        emoji: String,
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });

const existingMessageModel = mongoose.models.Message;
const supportsLocationType = existingMessageModel?.schema
  ?.path("messageType")
  ?.enumValues?.includes("location");
const supportsVideoType = existingMessageModel?.schema
  ?.path("messageType")
  ?.enumValues?.includes("video");
const supportsCallType = existingMessageModel?.schema
  ?.path("messageType")
  ?.enumValues?.includes("call");
const supportsDeliveredTo = Boolean(existingMessageModel?.schema?.path("deliveredTo"));
const supportsEditedAt = Boolean(existingMessageModel?.schema?.path("editedAt"));
const supportsDeletedFor = Boolean(existingMessageModel?.schema?.path("deletedFor"));

if (
  existingMessageModel &&
  (!supportsLocationType ||
    !supportsVideoType ||
    !supportsCallType ||
    !supportsDeliveredTo ||
    !supportsEditedAt ||
    !supportsDeletedFor)
) {
  mongoose.deleteModel("Message");
}

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
