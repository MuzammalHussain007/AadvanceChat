"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Login from "@/components/Login";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      router.push("/chat");
    }
  }, [router]);

  return <Login />;
}
