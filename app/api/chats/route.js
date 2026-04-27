import { connectDB } from "@/lib/mongodb";
import Chat from "@/models/Chat";
import Message from "@/models/Message";
import { verifyToken } from "@/lib/auth";
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

    const chats = await Chat.find({
      participants: decoded.userId,
    })
      .sort({ lastMessageTime: -1 })
      .populate("participants", "username fullName avatar status lastSeen")
      .populate("lastMessage", "content messageType fileName");

    const uniqueChats = [];
    const directChatSeen = new Set();

    for (const chat of chats) {
      const isDirectChat =
        !chat.isGroupChat && Array.isArray(chat.participants) && chat.participants.length === 2;

      if (!isDirectChat) {
        uniqueChats.push(chat);
        continue;
      }

      const otherParticipant = chat.participants.find(
        (participant) => String(participant._id) !== String(decoded.userId)
      );

      const key = otherParticipant ? String(otherParticipant._id) : String(chat._id);
      if (directChatSeen.has(key)) {
        continue;
      }

      directChatSeen.add(key);
      uniqueChats.push(chat);
    }

    const chatsWithUnread = await Promise.all(
      uniqueChats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: decoded.userId },
          "readBy.userId": { $ne: decoded.userId },
        });

        return {
          ...chat.toObject(),
          lastMessagePreview: buildLastMessagePreview(chat.lastMessage),
          unreadCount,
        };
      })
    );

    return NextResponse.json(chatsWithUnread);
  } catch (error) {
    console.error("Get chats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildLastMessagePreview(lastMessage) {
  if (!lastMessage) return "No messages yet";
  if (typeof lastMessage === "string") return "No messages yet";

  const type = lastMessage.messageType || "text";
  if (type === "text") {
    return lastMessage.content || "No messages yet";
  }
  if (type === "image") return "Photo";
  if (type === "video") return "Video";
  if (type === "voice") return "Voice message";
  if (type === "file") return lastMessage.fileName || "File";
  if (type === "location") return "Location shared";
  return "New message";
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
    const { participantIds, name, isGroupChat } = body;

    if (!participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: "participantIds are required" },
        { status: 400 }
      );
    }

    const participants = [decoded.userId, ...participantIds];

    // Reuse an existing direct chat between the same two users.
    if (!isGroupChat && participantIds.length === 1) {
      const existingChat = await Chat.findOne({
        isGroupChat: false,
        participants: { $all: participants, $size: 2 },
      }).populate("participants", "username fullName avatar status lastSeen");

      if (existingChat) {
        return NextResponse.json(existingChat);
      }
    }

    const chat = new Chat({
      name: name || "New Chat",
      isGroupChat: isGroupChat || participantIds.length > 1,
      participants,
      admin: decoded.userId,
    });

    await chat.save();
    await chat.populate("participants", "username fullName avatar status lastSeen");

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
