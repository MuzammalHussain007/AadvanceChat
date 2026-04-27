"use client";

import { useEffect, useState, useRef } from "react";
import Message from "./Message";
import MessageInput from "./MessageInput";
import CallPanel from "./CallPanel";

export default function ChatWindow({ chat, currentUser, onBack, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [participantPresence, setParticipantPresence] = useState(null);
  const [callActions, setCallActions] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const chatId = chat?._id || "";
  const currentUserId = currentUser?._id || "";
  const isGroupChat = Boolean(chat?.isGroupChat);
  const otherParticipantId =
    chat?.participants?.find(
      (participant) => String(participant._id) !== String(currentUserId)
    )?._id || "";
  const otherParticipant = chat?.participants?.find(
    (participant) => String(participant._id) !== String(currentUserId)
  );
  const headerName = chat?.isGroupChat
    ? chat?.name || "Group"
    : otherParticipant?.fullName || otherParticipant?.username || "Unknown";
  const headerAvatar =
    (chat?.isGroupChat ? chat?.avatar : otherParticipant?.avatar) ||
    otherParticipant?.profileImage ||
    otherParticipant?.image ||
    "";

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  };

  const checkIsNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) {
      return true;
    }

    const threshold = 120;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= threshold;
  };

  const handleMessagesScroll = () => {
    const nearBottom = checkIsNearBottom();
    setIsNearBottom(nearBottom);
    if (nearBottom) {
      setUnseenMessageCount(0);
    }
  };

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom]);

  useEffect(() => {
    // Ensure first chat open lands at the latest messages so the input bar stays visible.
    if (!chatId) return;
    const timer = setTimeout(() => {
      scrollToBottom();
      setUnseenMessageCount(0);
      setIsNearBottom(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    let isFetching = false;
    let mounted = true;
    let activeController = null;

    const fetchMessages = async () => {
      if (isFetching) {
        return;
      }

      try {
        isFetching = true;
        activeController?.abort?.();
        activeController = new AbortController();
        const token = localStorage.getItem("authToken");
        if (!token) {
          return;
        }

        const response = await fetch(`/api/messages?chatId=${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: activeController.signal,
        });

        if (response.ok) {
          const data = await response.json();
          if (!mounted) {
            return;
          }
          setMessages((previous) => {
            if (JSON.stringify(previous) === JSON.stringify(data)) {
              return previous;
            }

            const previousIds = new Set(previous.map((message) => message._id));
            const incomingMessages = data.filter(
              (message) =>
                !previousIds.has(message._id) &&
                String(message.senderId) !== String(currentUserId)
            );

            if (incomingMessages.length > 0 && !checkIsNearBottom()) {
              setUnseenMessageCount((count) => count + incomingMessages.length);
              setIsNearBottom(false);
            }

            return data;
          });
        }
      } catch (error) {
        const message = String(error?.message || "");
        const isExpectedFetchFailure =
          error?.name === "AbortError" ||
          message.includes("Failed to fetch") ||
          message.includes("Load failed") ||
          message.includes("NetworkError");
        if (!isExpectedFetchFailure) {
          console.error("Error fetching messages:", error);
        }
      } finally {
        isFetching = false;
      }
    };

    fetchMessages();

    // Keep the active chat updated for near real-time conversations.
    const interval = setInterval(fetchMessages, 2500);
    return () => {
      mounted = false;
      if (activeController) {
        activeController.abort();
      }
      clearInterval(interval);
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!chatId || !currentUserId || isGroupChat || !otherParticipantId) {
      return;
    }

    let cancelled = false;
    const fetchPresence = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(`/api/users/${otherParticipantId}/presence`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setParticipantPresence(data);
        }
      } catch {}
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chatId, currentUserId, isGroupChat, otherParticipantId]);

  const formatLastSeen = (dateValue) => {
    if (!dateValue) {
      return "last seen unavailable";
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "last seen unavailable";
    }

    return `last seen ${date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const getDirectChatStatus = () => {
    if (!participantPresence) {
      return "offline";
    }
    return participantPresence.status === "online" ? "online" : "offline";
  };

  const handleSendMessage = async (messageData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [...prev, newMessage]);
        onNewMessage?.(newMessage);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Error sending message:",
          errorData?.error || `Request failed with status ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageChange = (action, payload) => {
    if (action === "edited") {
      setMessages((previous) =>
        previous.map((message) =>
          message._id === payload._id ? payload : message
        )
      );
      return;
    }

    if (action === "deletedForMe" || action === "deletedForEveryone") {
      setMessages((previous) =>
        previous.filter((message) => message._id !== payload.messageId)
      );
    }
  };

  const getDateLabel = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const diffDays = Math.floor(
      (todayStart.getTime() - messageDayStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-4">
        <p className="text-center text-base text-gray-500 sm:text-lg">
          Select a chat to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="border-b border-gray-300 bg-white p-3 shadow sm:p-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 md:hidden"
          >
            Back
          </button>
          <ProfileAvatar name={headerName} avatar={headerAvatar} sizeClass="w-10 h-10" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">{headerName}</h2>
            <p className="text-sm text-gray-500">
              {chat.isGroupChat
                ? `${chat.participants?.length || 1} participants`
                : getDirectChatStatus()}
            </p>
          </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => callActions?.startAudio?.()}
              disabled={!callActions?.canStart}
              className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              📞 Audio
            </button>
            <button
              onClick={() => callActions?.startVideo?.()}
              disabled={!callActions?.canStart}
              className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              🎥 Video
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <CallPanel chat={chat} currentUser={currentUser} onActionsChange={setCallActions} />

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="relative flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => {
            const currentDateLabel = getDateLabel(msg.createdAt);
            const previousDateLabel =
              index > 0 ? getDateLabel(messages[index - 1].createdAt) : null;
            const shouldShowDateSeparator =
              index === 0 || currentDateLabel !== previousDateLabel;

            return (
              <div key={msg._id}>
                {shouldShowDateSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                      {currentDateLabel}
                    </span>
                  </div>
                )}
                <Message
                  message={msg}
                  isCurrentUser={msg.senderId === currentUser?._id}
                  currentUserId={currentUser?._id}
                  chat={chat}
                  onMessageChange={handleMessageChange}
                />
              </div>
            );
          })
        )}
        {unseenMessageCount > 0 && (
          <button
            onClick={() => {
              scrollToBottom();
              setUnseenMessageCount(0);
              setIsNearBottom(true);
            }}
            className="sticky bottom-3 left-1/2 z-10 mx-auto block rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-500"
          >
            {unseenMessageCount} new message{unseenMessageCount > 1 ? "s" : ""}
          </button>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        loading={loading}
        chatId={chat._id}
      />
    </div>
  );
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
