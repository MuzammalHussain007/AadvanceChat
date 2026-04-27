"use client";

import { useEffect, useState } from "react";

export default function ChatList({ onSelectChat, currentChat, currentUser }) {
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isFetching = false;
    let mounted = true;
    let activeController = null;

    const fetchChatsAndUsers = async () => {
      if (isFetching) {
        return;
      }

      try {
        isFetching = true;
        activeController?.abort?.();
        activeController = new AbortController();
        const token = localStorage.getItem("authToken");
        if (!token) {
          setLoading(false);
          return;
        }

        const [chatsResponse, usersResponse] = await Promise.all([
          fetch("/api/chats", {
            headers: { Authorization: `Bearer ${token}` },
            signal: activeController.signal,
          }),
          fetch("/api/users", {
            headers: { Authorization: `Bearer ${token}` },
            signal: activeController.signal,
          }),
        ]);

        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json();
          if (!mounted) return;
          setChats(chatsData);
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          if (!mounted) return;
          setUsers(usersData);
        }
      } catch (error) {
        const message = String(error?.message || "");
        const isExpectedFetchFailure =
          error?.name === "AbortError" ||
          message.includes("Failed to fetch") ||
          message.includes("Load failed") ||
          message.includes("NetworkError");
        if (!isExpectedFetchFailure) {
          console.error("Error fetching chats/users:", error);
        }
      } finally {
        isFetching = false;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchChatsAndUsers();

    // Refresh chats and users every 5 seconds
    const interval = setInterval(fetchChatsAndUsers, 5000);
    return () => {
      mounted = false;
      if (activeController) {
        activeController.abort();
      }
      clearInterval(interval);
    };
  }, []);

  const handleStartDirectChat = async (user) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantIds: [user._id],
          name: user.username,
          isGroupChat: false,
        }),
        });

        if (response.ok) {
        const chat = await response.json();
        setChats((previous) => {
          const alreadyExists = previous.some((item) => item._id === chat._id);
          if (alreadyExists) {
            return previous;
          }
          return [chat, ...previous];
        });
        onSelectChat(chat);
      }
    } catch (error) {
      console.error("Error creating direct chat:", error);
    }
  };

  const filteredChats = chats.filter((chat) =>
    getChatDisplayName(chat, currentUser)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const usersWithExistingDirectChats = new Set(
    chats
      .filter(
        (chat) =>
          !chat.isGroupChat && Array.isArray(chat.participants) && chat.participants.length === 2
      )
      .map((chat) =>
        chat.participants.find(
          (participant) => String(participant._id) !== String(currentUser?._id)
        )?._id
      )
      .filter(Boolean)
  );

  const usersToShow = users.filter(
    (user) => !usersWithExistingDirectChats.has(user._id)
  );

  return (
    <div className="flex h-full w-full flex-col border-r border-gray-300 bg-white">
      {/* Header */}
      <div className="border-b border-gray-300 p-3 sm:p-4">
        <h1 className="mb-3 text-xl font-bold text-gray-900 sm:mb-4 sm:text-2xl">Chats</h1>
        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No chats found</div>
        ) : (
          filteredChats.map((chat) => {
            const { name, avatar } = getChatIdentity(chat, currentUser);
            return (
              <div
                key={chat._id}
                onClick={() => onSelectChat(chat)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition ${
                  currentChat?._id === chat._id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <ProfileAvatar name={name} avatar={avatar} sizeClass="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessagePreview || "No messages yet"}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last chat: {formatLastChat(chat.lastMessageTime)}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Registered Users */}
      {usersToShow.length > 0 && (
        <div className="border-t border-gray-300 p-3 sm:p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Registered Profiles
          </h2>
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {usersToShow.map((user) => (
              <button
                key={user._id}
                onClick={() => handleStartDirectChat(user)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-100"
              >
                <ProfileAvatar
                  name={user.fullName || user.username}
                  avatar={user.avatar}
                  sizeClass="h-8 w-8"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user.fullName || user.username}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Chat Button */}
      <div className="border-t border-gray-300 p-3 sm:p-4">
        <button className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold">
          + New Chat
        </button>
      </div>
    </div>
  );
}

function getChatIdentity(chat, currentUser) {
  if (!chat) {
    return { name: "Unknown", avatar: "" };
  }

  if (!chat.isGroupChat && Array.isArray(chat.participants)) {
    const other = chat.participants.find(
      (participant) => String(participant._id) !== String(currentUser?._id)
    );
    if (other) {
      return {
        name: other.fullName || other.username || "Unknown",
        avatar: other.avatar || other.profileImage || other.image || "",
      };
    }
  }

  return {
    name: chat.name || "Unnamed chat",
    avatar: chat.avatar || "",
  };
}

function getChatDisplayName(chat, currentUser) {
  return getChatIdentity(chat, currentUser).name;
}

function ProfileAvatar({ name, avatar, sizeClass }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

  const palette = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
  ];
  const hash = [...(name || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];

  if (avatar) {
    return <img src={avatar} alt={name} className={`${sizeClass} rounded-full object-cover`} />;
  }

  return (
    <div
      className={`${sizeClass} ${bg} flex items-center justify-center rounded-full font-semibold text-white`}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}

function formatLastChat(value) {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
