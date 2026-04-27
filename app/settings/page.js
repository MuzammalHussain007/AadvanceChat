"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [imageSrc, setImageSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load profile");
        const user = await response.json();
        setFullName(user.fullName || user.username || "");
        setUsername(user.username || "");
        setImageSrc(user.avatar || "");
      } catch (e) {
        setError("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      stopCamera();
    };
  }, [router, stopCamera]);

  /** Bind stream after <video> exists — it was hidden until cameraOn, so ref was null before. */
  useEffect(() => {
    if (!cameraOn || !cameraStreamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = cameraStreamRef.current;
    const play = () => {
      video.play().catch(() => {});
    };
    play();
    video.onloadedmetadata = play;
    return () => {
      video.onloadedmetadata = null;
    };
  }, [cameraOn]);

  const startCamera = async () => {
    setError("");
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("Camera API is not available in this browser.");
        return;
      }

      if (typeof window !== "undefined" && !window.isSecureContext) {
        const host = window.location.hostname;
        if (host !== "localhost" && host !== "127.0.0.1") {
          setError(
            "Camera needs HTTPS or localhost. Open the app at http://localhost:3000 (not a LAN IP) or use HTTPS."
          );
          return;
        }
      }

      stopCamera();

      // Try common constraints first, then fall back.
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      cameraStreamRef.current = stream;
      setCameraOn(true);
    } catch (e) {
      const message = String(e?.message || "");
      if (message.toLowerCase().includes("permission")) {
        setError("Camera permission denied. Please allow camera access in browser settings.");
      } else if (message.toLowerCase().includes("secure")) {
        setError("Camera requires a secure context (https or localhost).");
      } else {
        setError("Unable to access camera.");
      }
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setImageSrc(canvas.toDataURL("image/png"));
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    stopCamera();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(String(reader.result || ""));
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  const buildCroppedBlob = () =>
    new Promise((resolve, reject) => {
      if (!imageSrc) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }

        const baseScale = Math.max(size / img.width, size / img.height);
        const scale = baseScale * zoom;
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const x = (size - drawW) / 2 + offsetX;
        const y = (size - drawH) / 2 + offsetY;

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, x, y, drawW, drawH);
        canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = imageSrc;
    });

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      let avatarUrl = imageSrc || null;
      if (imageSrc && !imageSrc.startsWith("/uploads/")) {
        const croppedBlob = await buildCroppedBlob();
        if (croppedBlob) {
          const formData = new FormData();
          formData.append("file", new File([croppedBlob], "avatar.png", { type: "image/png" }));
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
          avatarUrl = uploadData.url;
        }
      }

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, avatar: avatarUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");

      const existing = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...existing, ...data }));
      setSuccess("Profile updated successfully.");
      if (data.avatar) {
        setImageSrc(data.avatar);
      }
    } catch (e) {
      setError(e.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 sm:p-6">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-4 shadow sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Settings</h1>
          <button
            onClick={() => router.push("/chat")}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Back to chat
          </button>
        </div>

        {error && <p className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && (
          <p className="mb-3 rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Username</label>
              <input
                value={username}
                disabled
                className="w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
              />
            </div>

            <div className="rounded border border-gray-200 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Profile Photo Source</p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
                  Upload from device
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                {!cameraOn ? (
                  <button
                    onClick={startCamera}
                    className="rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Open camera
                  </button>
                ) : (
                  <>
                    <button
                      onClick={captureFromCamera}
                      className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="rounded bg-gray-500 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Stop camera
                    </button>
                  </>
                )}
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`mt-3 h-56 w-full rounded bg-black object-cover ${
                  cameraOn ? "" : "hidden"
                }`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Crop Preview</p>
            <div className="relative h-60 w-full overflow-hidden rounded-lg bg-gray-900 sm:h-72">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/70">
                  Select or capture an image
                </div>
              )}
            </div>
            <div className="space-y-2 rounded border border-gray-200 p-3">
              <label className="block text-xs font-medium text-gray-600">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Horizontal
                <input
                  type="range"
                  min="-140"
                  max="140"
                  step="1"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Vertical
                <input
                  type="range"
                  min="-140"
                  max="140"
                  step="1"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
