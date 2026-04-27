"use client";

import { useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

const getFirstSupportedMimeType = (mimeTypes) => {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

export default function MessageInput({ onSendMessage, loading, chatId }) {
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordingSeconds, setVideoRecordingSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("default");
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioStream = useRef(null);
  const videoRecorder = useRef(null);
  const videoChunks = useRef([]);
  const videoStream = useRef(null);
  const videoTimer = useRef(null);
  const videoSecondsRef = useRef(0);

  const loadAudioInputDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      setAudioInputDevices(inputs);

      if (inputs.length > 0 && !inputs.some((device) => device.deviceId === selectedAudioInput)) {
        setSelectedAudioInput("default");
      }
    } catch (error) {
      console.error("Could not load audio devices:", error);
      setStatusMessage("Could not access microphone list. Check browser permissions.");
    }
  };

  const getAudioConstraints = () => {
    const deviceConstraint =
      selectedAudioInput && selectedAudioInput !== "default"
        ? { deviceId: { exact: selectedAudioInput } }
        : {};

    return {
      ...deviceConstraint,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  };

  const selectedAudioLabel =
    selectedAudioInput === "default"
      ? "Default microphone"
      : audioInputDevices.find((device) => device.deviceId === selectedAudioInput)?.label ||
        "Selected microphone";

  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmoji(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId || loading) return;

    await onSendMessage({
      content: message,
      messageType: "text",
      chatId,
    });

    setMessage("");
    setShowActionsMenu(false);
  };

  const handleFileUpload = async (e) => {
    setStatusMessage("");
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        await onSendMessage({
          content: file.name,
          messageType: file.type.startsWith("image/") ? "image" : "file",
          mediaUrl: data.url,
          fileName: file.name,
          fileSize: file.size,
          chatId,
        });
        setShowActionsMenu(false);
      } else {
        console.error("File upload failed with status:", response.status);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      // Allow selecting the same file again by resetting input state.
      e.target.value = "";
    }
  };

  const startRecording = async () => {
    setStatusMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
      });
      audioStream.current = stream;

      const audioMimeType = getFirstSupportedMimeType([
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ]);

      mediaRecorder.current = audioMimeType
        ? new MediaRecorder(stream, { mimeType: audioMimeType })
        : new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, {
          type: mediaRecorder.current?.mimeType || "audio/webm",
        });

        if (audioBlob.size === 0) {
          setStatusMessage("Voice note is empty. Please allow microphone and try again.");
          return;
        }

        const formData = new FormData();
        formData.append("file", audioBlob, "voice.webm");
        formData.append("chatId", chatId);

        try {
          const token = localStorage.getItem("authToken");
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            await onSendMessage({
              content: "Voice message",
              messageType: "voice",
              mediaUrl: data.url,
              voiceDuration: audioBlob.size,
              chatId,
            });
          } else {
            console.error("Voice upload failed with status:", response.status);
          }
        } catch (error) {
          console.error("Voice upload error:", error);
        } finally {
          if (audioStream.current) {
            audioStream.current.getTracks().forEach((track) => track.stop());
            audioStream.current = null;
          }
          mediaRecorder.current = null;
        }
      };

      mediaRecorder.current.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      setStatusMessage("Microphone access failed. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      try {
        mediaRecorder.current.requestData();
      } catch {}
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleShareLocation = async () => {
    if (!chatId || loading || isSharingLocation) return;
    setStatusMessage("");

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported in this browser.");
      return;
    }

    setIsSharingLocation(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      await onSendMessage({
        content: `Shared location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        messageType: "location",
        mediaUrl: mapsUrl,
        chatId,
      });
      setShowActionsMenu(false);
    } catch (error) {
      console.error("Location sharing failed:", error);
    } finally {
      setIsSharingLocation(false);
    }
  };

  const startVideoRecording = async () => {
    if (!chatId || loading || isRecordingVideo) return;
    setStatusMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: getAudioConstraints(),
      });

      videoStream.current = stream;
      const videoMimeType = getFirstSupportedMimeType([
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ]);

      videoRecorder.current = videoMimeType
        ? new MediaRecorder(stream, { mimeType: videoMimeType })
        : new MediaRecorder(stream);
      videoChunks.current = [];
      setVideoRecordingSeconds(0);
      videoSecondsRef.current = 0;

      videoRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunks.current.push(event.data);
        }
      };

      videoRecorder.current.onstop = async () => {
        const duration = videoSecondsRef.current;

        if (duration < 1) {
          setStatusMessage("Video note is too short to send.");
          return;
        }

        const videoBlob = new Blob(videoChunks.current, {
          type: videoRecorder.current?.mimeType || "video/webm",
        });

        if (videoBlob.size === 0) {
          setStatusMessage("Video note is empty. Check camera/microphone permissions.");
          return;
        }

        const formData = new FormData();
        formData.append("file", videoBlob, `video-note-${Date.now()}.webm`);
        formData.append("chatId", chatId);

        try {
          const token = localStorage.getItem("authToken");
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            await onSendMessage({
              content: "Video note",
              messageType: "video",
              mediaUrl: data.url,
              fileName: data.filename,
              fileSize: videoBlob.size,
              videoDuration: duration,
              chatId,
            });
            setStatusMessage("Video note sent.");
          } else {
            setStatusMessage("Failed to upload video note.");
          }
        } catch (error) {
          console.error("Video upload error:", error);
          setStatusMessage("Video note upload failed.");
        } finally {
          if (videoStream.current) {
            videoStream.current.getTracks().forEach((track) => track.stop());
            videoStream.current = null;
          }
          videoRecorder.current = null;
        }
      };

      videoRecorder.current.start(1000);
      setIsRecordingVideo(true);

      videoTimer.current = setInterval(() => {
        setVideoRecordingSeconds((previous) => {
          const nextValue = previous + 1;
          videoSecondsRef.current = nextValue;
          if (nextValue >= 60) {
            setStatusMessage("60 seconds reached. Sending video note...");
            stopVideoRecording();
          }
          return nextValue;
        });
      }, 1000);
    } catch (error) {
      console.error("Video recording error:", error);
      setStatusMessage("Could not access camera/microphone.");
    }
  };

  const stopVideoRecording = () => {
    if (!videoRecorder.current || !isRecordingVideo) return;

    try {
      videoRecorder.current.requestData();
    } catch {}
    videoRecorder.current.stop();
    setIsRecordingVideo(false);

    if (videoTimer.current) {
      clearInterval(videoTimer.current);
      videoTimer.current = null;
    }

  };

  return (
    <div className="border-t border-gray-300 bg-white p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="audio-input" className="text-xs font-medium text-gray-600">
          Mic
        </label>
        <select
          id="audio-input"
          value={selectedAudioInput}
          onChange={(event) => setSelectedAudioInput(event.target.value)}
          onClick={loadAudioInputDevices}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 sm:w-auto sm:max-w-xs"
        >
          <option value="default">Default microphone</option>
          {audioInputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadAudioInputDevices}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          Refresh
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowActionsMenu((prev) => !prev);
              setShowEmoji(false);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600"
            aria-label="More actions"
          >
            ⋯
          </button>
          {showActionsMenu && (
            <div className="absolute bottom-12 left-0 z-40 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
              <div className="grid grid-cols-2 gap-1 text-gray-600">
                <label className="flex cursor-pointer items-center justify-center rounded px-2 py-2 text-sm hover:bg-gray-100">
                  📎
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowEmoji((prev) => !prev)}
                  className="rounded px-2 py-2 text-sm hover:bg-gray-100"
                >
                  😊
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                    setShowActionsMenu(false);
                  }}
                  className={`rounded px-2 py-2 text-sm hover:bg-gray-100 ${
                    isRecording ? "text-red-600" : ""
                  }`}
                >
                  🎤
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isRecordingVideo) {
                      stopVideoRecording();
                    } else {
                      startVideoRecording();
                    }
                    setShowActionsMenu(false);
                  }}
                  className={`rounded px-2 py-2 text-sm hover:bg-gray-100 ${
                    isRecordingVideo ? "text-red-600" : ""
                  }`}
                >
                  🎥
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleShareLocation();
                    setShowActionsMenu(false);
                  }}
                  disabled={loading || isSharingLocation}
                  className="rounded px-2 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                >
                  📍
                </button>
              </div>
              {showEmoji && (
                <div className="absolute bottom-2 left-[12.5rem] z-50 max-h-72 max-w-[90vw] overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          className="order-last min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:order-none sm:px-4"
        />

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || loading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {statusMessage && (
        <p className="mt-2 text-xs text-gray-600">{statusMessage}</p>
      )}
      {(isRecording || isRecordingVideo) && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span>Active mic: {selectedAudioLabel}</span>
        </div>
      )}
      {isRecordingVideo && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Recording video note...</span>
            <span>{Math.max(0, 60 - videoRecordingSeconds)}s left</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${Math.min(100, (videoRecordingSeconds / 60) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
