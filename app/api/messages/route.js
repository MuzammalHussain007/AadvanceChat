import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { userIdInParticipantList } from "@/lib/chatAccess";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: "Invalid chatId" }, { status: 400 });
    }

    const chat = await Chat.findById(chatId).select("participants");
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (!userIdInParticipantList(chat.participants, decoded.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: decoded.userId },
        "readBy.userId": { $ne: decoded.userId },
      },
      {
        $push: {
          readBy: {
            userId: decoded.userId,
            readAt: new Date(),
          },
        },
      }
    );

    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: decoded.userId },
        "deliveredTo.userId": { $ne: decoded.userId },
      },
      {
        $push: {
          deliveredTo: {
            userId: decoded.userId,
            deliveredAt: new Date(),
          },
        },
      }
    );

    const messages = await Message.find({
      chatId,
      deletedFor: { $ne: decoded.userId },
    })
      .sort({ createdAt: 1 })
      .limit(50);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      chatId,
      content,
      messageType,
      mediaUrl,
      fileName,
      fileSize,
      voiceDuration,
      videoDuration,
    } = body;

    if (!chatId || !content) {
      return NextResponse.json(
        { error: "chatId and content are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: "Invalid chatId" }, { status: 400 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chat = await Chat.findById(chatId).select("participants");
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (!userIdInParticipantList(chat.participants, decoded.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recipientIds = chat.participants
      .map((participantId) => String(participantId))
      .filter((participantId) => participantId !== String(decoded.userId));

    const onlineRecipients = await User.find({
      _id: { $in: recipientIds },
      status: "online",
    }).select("_id");

    const deliveredTo = onlineRecipients.map((recipient) => ({
      userId: recipient._id,
      deliveredAt: new Date(),
    }));

    const message = new Message({
      chatId,
      senderId: decoded.userId,
      senderName: user.username,
      senderAvatar: user.avatar,
      content,
      messageType: messageType || "text",
      mediaUrl,
      fileName,
      fileSize,
      voiceDuration,
      videoDuration,
      readBy: [{ userId: decoded.userId, readAt: new Date() }],
      deliveredTo,
    });

    await message.save();

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      lastMessageTime: new Date(),
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
