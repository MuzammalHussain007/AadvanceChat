import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import CallSignal from "@/models/CallSignal";
import Chat from "@/models/Chat";
import { verifyToken } from "@/lib/auth";
import { userIdInParticipantList } from "@/lib/chatAccess";
import { NextResponse } from "next/server";

const getAuthUserId = (request) => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
};

export async function GET(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const since = searchParams.get("since");

    const query = {
      fromUserId: { $ne: userId, $exists: true },
      $or: [{ toUserId: null }, { toUserId: userId }],
    };
    if (roomId) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
      }
      const chat = await Chat.findById(roomId).select("participants");
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      if (!userIdInParticipantList(chat.participants, userId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      query.roomId = roomId;
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        query.createdAt = { $gte: sinceDate };
      }
    }

    const signals = await CallSignal.find(query)
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return NextResponse.json(signals);
  } catch (error) {
    console.error("Get call signals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { roomId, toUserId = null, signalType, payload = {} } = body;

    if (!roomId || !signalType) {
      return NextResponse.json(
        { error: "roomId and signalType are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(String(roomId))) {
      return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
    }

    const chat = await Chat.findById(roomId).select("participants");
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (!userIdInParticipantList(chat.participants, userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const signal = await CallSignal.create({
      roomId,
      fromUserId: userId,
      toUserId,
      signalType,
      payload,
    });

    return NextResponse.json(signal);
  } catch (error) {
    console.error("Create call signal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
