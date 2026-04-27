"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Register from "@/components/Register";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      router.push("/chat");
    }
  }, [router]);

  return <Register />;
}
