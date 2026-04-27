import { createRequire } from "module";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Chat from "@/models/Chat";
import { verifyToken } from "@/lib/auth";
import { agoraChannelForRoom, agoraUidFromUserId } from "@/lib/agoraCall";
import { userIdInParticipantList } from "@/lib/chatAccess";

const require = createRequire(import.meta.url);
const { RtcTokenBuilder, RtcRole } = require("agora-token");

const getAuthUserId = (request) => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId != null ? String(decoded.userId) : null;
};

export async function POST(request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { roomId } = body;
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(String(roomId))) {
      return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
    }

    await connectDB();
    const chat = await Chat.findById(roomId).select("participants");
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (!userIdInParticipantList(chat.participants, userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      return NextResponse.json(
        {
          error:
            "Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env.local",
        },
        { status: 503 }
      );
    }

    const channelName = agoraChannelForRoom(roomId);
    const uid = agoraUidFromUserId(userId);
    const tokenExpireSeconds = 3600;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      tokenExpireSeconds,
      tokenExpireSeconds
    );

    return NextResponse.json({
      appId,
      token,
      uid,
      channelName,
    });
  } catch (error) {
    console.error("Agora token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
