"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const loading = !authReady;
  const currentUserId = currentUser?._id ? String(currentUser._id) : "";
  const isAuthenticated = authReady && !!currentUserId;
  const lastGlobalSignalTsRef = useRef(new Date(0).toISOString());
  const processedGlobalSignalIdsRef = useRef(new Set());
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      setCurrentUser(saved ? JSON.parse(saved) : null);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    if (!currentUser) {
      router.push("/login");
    }
  }, [authReady, currentUser, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    const updatePresence = () =>
      fetch("/api/auth/presence", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

    updatePresence();
    const interval = setInterval(updatePresence, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) return;
    lastGlobalSignalTsRef.current = new Date(Date.now() - 5000).toISOString();

    let cancelled = false;
    const pollIncomingCalls = async () => {
      try {
        const response = await fetch(
          `/api/calls/signals?since=${encodeURIComponent(lastGlobalSignalTsRef.current)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) return;

        const signals = await response.json();
        if (!Array.isArray(signals)) {
          return;
        }
        for (const signal of signals) {
          const signalId = String(signal?._id || "");
          if (signalId && processedGlobalSignalIdsRef.current.has(signalId)) {
            continue;
          }

          if (signal?.signalType === "call-start" && signal?.roomId) {
            const chatsResponse = await fetch("/api/chats", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (chatsResponse.ok && !cancelled) {
              const chats = await chatsResponse.json();
              const incomingChat = chats.find(
                (chat) => String(chat?._id) === String(signal.roomId)
              );
              if (incomingChat) {
                setSelectedChat(incomingChat);
                setMobileSidebarOpen(false);
              }
            }
          }

          if (signalId) {
            processedGlobalSignalIdsRef.current.add(signalId);
            if (processedGlobalSignalIdsRef.current.size > 1000) {
              const ids = Array.from(processedGlobalSignalIdsRef.current);
              processedGlobalSignalIdsRef.current = new Set(ids.slice(-500));
            }
          }

          const rawCreated = signal?.createdAt;
          if (rawCreated != null && rawCreated !== "") {
            const created = new Date(rawCreated);
            if (!Number.isNaN(created.getTime())) {
              const createdAt = created.toISOString();
              if (createdAt >= lastGlobalSignalTsRef.current) {
                lastGlobalSignalTsRef.current = createdAt;
              }
            }
          }
        }
      } catch {}
    };

    pollIncomingCalls();
    const interval = setInterval(pollIncomingCalls, 800);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, currentUserId]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-gray-100">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 md:hidden"
          >
            {mobileSidebarOpen ? "Hide chats" : "Show chats"}
          </button>
          <ProfileAvatar
            name={currentUser?.fullName || currentUser?.username}
            avatar={currentUser?.avatar}
          />
          <div className="min-w-0 text-sm text-gray-700">
            <p className="truncate font-semibold">{currentUser?.fullName || currentUser?.username}</p>
            <p className="truncate text-xs text-gray-500">{currentUser?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 sm:px-4 sm:text-sm"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 sm:px-4 sm:text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } absolute inset-y-0 left-0 z-20 h-full w-[86%] max-w-sm self-stretch bg-white transition-transform duration-200 md:static md:h-full md:w-80 md:max-w-none md:translate-x-0`}
        >
          <ChatList
            onSelectChat={(chat) => {
              setSelectedChat(chat);
              setMobileSidebarOpen(false);
            }}
            currentChat={selectedChat}
            currentUser={currentUser}
          />
        </aside>
        {mobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 z-10 bg-black/20 md:hidden"
            aria-label="Close chat sidebar"
          />
        )}

        <main className="min-h-0 min-w-0 flex-1">
          <ChatWindow
            key={selectedChat?._id || "no-chat"}
            chat={selectedChat}
            currentUser={currentUser}
            onBack={() => setMobileSidebarOpen(true)}
            onNewMessage={() => {
              // Handle new message in real-time
            }}
          />
        </main>
      </div>
    </div>
  );
}

function ProfileAvatar({ name, avatar }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-10 w-10 rounded-full border border-gray-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
      {initials}
    </div>
  );
}
