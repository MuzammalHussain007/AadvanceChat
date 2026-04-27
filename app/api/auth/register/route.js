import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const { username, fullName = "", email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = new User({
      username,
      fullName: fullName.trim() || username,
      email,
      password,
      status: "online",
      lastSeen: new Date(),
    });

    await newUser.save();

    const token = generateToken(newUser._id);
    await setAuthCookie(token);

    return NextResponse.json({
      token,
      user: newUser.toJSON(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
