import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthCookie, removeAuthCookie, verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const headerToken = request.headers.get("authorization")?.split(" ")[1];
    const cookieToken = await getAuthCookie();
    const token = headerToken || cookieToken;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.userId) {
        await connectDB();
        await User.findByIdAndUpdate(decoded.userId, {
          status: "offline",
          lastSeen: new Date(),
        });
      }
    }
    await removeAuthCookie();

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
