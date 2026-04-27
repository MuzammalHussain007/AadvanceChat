import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const DEFAULT_JWT_SECRET = "your-secret-key-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (
  process.env.NODE_ENV === "production" &&
  JWT_SECRET === DEFAULT_JWT_SECRET
) {
  console.warn(
    "[auth] JWT_SECRET is not set or still default — set a strong JWT_SECRET in production."
  );
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function getAuthCookie() {
  const cookieStore = await cookies();
  return cookieStore.get("authToken")?.value;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("authToken");
}
