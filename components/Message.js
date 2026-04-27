"use client";

import { useRef, useState } from "react";

export default function Message({
  message,
  isCurrentUser,
  currentUserId,
  chat,
  onMessageChange,
}) {
  const audioRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || "");
  const [isWorking, setIsWorking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const otherParticipantId = chat?.participants?.find(
    (participant) => String(participant._id) !== String(currentUserId)
  )?._id;

  const hasRead = message.readBy?.some(
    (entry) => String(entry.userId) === String(otherParticipantId)
  );
  const hasDelivered = message.deliveredTo?.some(
    (entry) => String(entry.userId) === String(otherParticipantId)
  );

  const getTickStyle = () => {
    if (hasRead) {
      return "✓✓";
    }
    if (hasDelivered) {
      return "✓✓";
    }
    return "✓";
  };

  const getTickColor = () => {
    if (hasRead) {
      return "text-white";
    }
    return "text-gray-400";
  };

  const handleEditMessage = async () => {
    const trimmed = editedContent.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      setEditedContent(message.content || "");
      return;
    }

    setIsWorking(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/messages/${message._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to edit message");
      }

      onMessageChange?.("edited", data);
      setIsEditing(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Edit message failed:", error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteMessage = async (deleteForEveryone) => {
    setIsWorking(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/messages/${message._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleteForEveryone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete message");
      }

      onMessageChange?.(
        deleteForEveryone ? "deletedForEveryone" : "deletedForMe",
        { messageId: message._id }
      );
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Delete message failed:", error);
    } finally {
      setIsWorking(false);
    }
  };

  const showEditOption = isCurrentUser && message.messageType === "text";
  const showDeleteForEveryoneOption = isCurrentUser;
  const showDeleteForMeOption = true;

  const renderContent = () => {
    switch (message.messageType) {
      case "image":
        return (
          <img
            src={message.mediaUrl}
            alt="Message"
            className="max-h-80 w-full max-w-[16rem] rounded-lg object-cover sm:max-w-xs"
          />
        );
      case "file":
        return (
          <a
            href={message.mediaUrl}
            download={message.fileName}
            className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 16.5a1 1 0 11-2 0 1 1 0 012 0zM15 7a1 1 0 11-2 0 1 1 0 012 0zM9 6a1 1 0 11-2 0 1 1 0 012 0z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 1 1 0 000 2h.01a1 1 0 000-2H6a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V7a1 1 0 100-2h-.01a1 1 0 000 2H14a1 1 0 100-2h-2a2 2 0 00-2 2v9H6V5z"
              />
            </svg>
            <span>{message.fileName}</span>
          </a>
        );
      case "voice":
        return (
          <div className="flex items-center gap-2">
            <audio
              ref={audioRef}
              src={message.mediaUrl}
              controls
              className="h-8"
            />
          </div>
        );
      case "video":
        return (
          <div className="space-y-2">
            <video
              src={message.mediaUrl}
              controls
              className="max-h-80 w-full rounded-lg bg-black"
            />
            {typeof message.videoDuration === "number" && (
              <p className="text-xs opacity-80">
                Duration: {Math.round(message.videoDuration)}s
              </p>
            )}
          </div>
        );
      case "location":
        return (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-300"
          >
            <span>📍</span>
            <span>View shared location</span>
          </a>
        );
      case "call":
        return (
          <div className="inline-flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-sm">
            <span>📞</span>
            <span>{message.content}</span>
          </div>
        );
      default:
        return <span>{message.content}</span>;
    }
  };

  return (
    <div
      className={`flex ${
        isCurrentUser ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`relative max-w-[85vw] px-3 py-2 sm:max-w-xs sm:px-4 lg:max-w-md rounded-lg ${
          isCurrentUser
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-200 text-gray-900 rounded-bl-none"
        }`}
      >
        {!isEditing && (
          <div className="absolute right-2 top-2">
            <button
              onClick={() => setIsMenuOpen((open) => !open)}
              disabled={isWorking}
              className={`rounded p-1 text-xs ${
                isCurrentUser ? "text-white/90 hover:bg-white/20" : "text-gray-600 hover:bg-black/10"
              }`}
              title="Message actions"
            >
              ⋮
            </button>

            {isMenuOpen && (
              <div
                className={`absolute right-0 z-20 mt-1 w-40 rounded-md border bg-white py-1 text-xs shadow-lg ${
                  isCurrentUser ? "border-blue-100" : "border-gray-200"
                }`}
              >
                {showEditOption && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>
                )}
                {showDeleteForMeOption && (
                  <button
                    onClick={() => handleDeleteMessage(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    <span>🗑️</span>
                    <span>Delete for me</span>
                  </button>
                )}
                {showDeleteForEveryoneOption && (
                  <button
                    onClick={() => handleDeleteMessage(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                  >
                    <span>🗑️</span>
                    <span>Delete for everyone</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!isCurrentUser && (
          <p className="text-sm font-semibold text-gray-600 mb-1">
            {message.senderName}
          </p>
        )}
        <div className="break-words">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedContent}
                onChange={(event) => setEditedContent(event.target.value)}
                className="w-full rounded-md border border-white/30 bg-white/20 p-2 text-sm text-white placeholder-white/70 outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(message.content || "");
                  }}
                  className="rounded bg-white/20 px-2 py-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditMessage}
                  disabled={isWorking}
                  className="rounded bg-white px-2 py-1 text-xs text-blue-600"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1 text-xs opacity-80">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isCurrentUser && !chat?.isGroupChat && otherParticipantId && (
            <span className={`font-semibold ${getTickColor()}`}>{getTickStyle()}</span>
          )}
          {message.editedAt && <span>(edited)</span>}
        </div>
      </div>
    </div>
  );
}
