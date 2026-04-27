import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";

const getAuthUser = async (request) => {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;
  await connectDB();
  return User.findById(decoded.userId);
};

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(user.toJSON());
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : user.fullName;
    const avatar =
      typeof body.avatar === "string" ? body.avatar.trim() || null : user.avatar;

    user.fullName = fullName || user.username;
    user.avatar = avatar;
    await user.save();

    return NextResponse.json(user.toJSON());
  } catch (error) {
    console.error("Update current user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
