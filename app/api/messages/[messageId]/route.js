import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import { verifyToken } from "@/lib/auth";
import { userIdInParticipantList } from "@/lib/chatAccess";
import { NextResponse } from "next/server";

const getUserIdFromRequest = async (request) => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
};

export async function PATCH(request, { params }) {
  try {
    const { messageId } = await params;
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
    }

    await connectDB();
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const chat = await Chat.findById(message.chatId).select("participants");
    if (!chat || !userIdInParticipantList(chat.participants, userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (String(message.senderId) !== String(userId)) {
      return NextResponse.json(
        { error: "Only sender can edit this message" },
        { status: 403 }
      );
    }

    if (message.messageType !== "text") {
      return NextResponse.json(
        { error: "Only text messages can be edited" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const content = body?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Edited message content is required" },
        { status: 400 }
      );
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    return NextResponse.json(message);
  } catch (error) {
    console.error("Edit message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { messageId } = await params;
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
    }

    await connectDB();
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const chat = await Chat.findById(message.chatId).select("participants");
    if (!chat || !userIdInParticipantList(chat.participants, userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const deleteForEveryone = Boolean(body?.deleteForEveryone);

    if (deleteForEveryone) {
      if (String(message.senderId) !== String(userId)) {
        return NextResponse.json(
          { error: "Only sender can delete for everyone" },
          { status: 403 }
        );
      }

      const chatId = message.chatId;
      await Message.findByIdAndDelete(messageId);

      const latestMessage = await Message.findOne({ chatId })
        .sort({ createdAt: -1 })
        .select("_id createdAt");

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: latestMessage?._id || null,
        lastMessageTime: latestMessage?.createdAt || new Date(),
      });

      return NextResponse.json({ success: true, deletedForEveryone: true });
    }

    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { deletedFor: userId } }
    );

    return NextResponse.json({ success: true, deletedForEveryone: false });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
