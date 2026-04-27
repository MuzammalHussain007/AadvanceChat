"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Agora throws this when leave/unmount cancels an in-flight join or subscribe (e.g. React Strict Mode). */
function isAgoraCanceledError(err) {
  if (!err) return false;
  const code = err.code;
  const msg = String(err.message || "");
  return (
    code === "OPERATION_ABORTED" ||
    code === "CANCEL_TOKEN_CANCELED" ||
    msg.includes("OPERATION_ABORTED") ||
    msg.includes("cancel token")
  );
}

function isDeviceBusyError(err) {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "");
  return (
    code.includes("NOT_READABLE") ||
    msg.includes("NotReadableError") ||
    msg.toLowerCase().includes("device in use")
  );
}

export default function CallPanel({ chat, currentUser, onActionsChange }) {
  const [callMode, setCallMode] = useState(null);
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [hasLocalCamera, setHasLocalCamera] = useState(false);
  const [isRetryingCamera, setIsRetryingCamera] = useState(false);
  const [mediaPlayNonce, setMediaPlayNonce] = useState(0);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [audioInputs, setAudioInputs] = useState([]);
  const [videoInputs, setVideoInputs] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState("default");
  const [selectedInputId, setSelectedInputId] = useState("default");
  const [selectedCameraId, setSelectedCameraId] = useState("default");

  const localVideoContainerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const ringtoneTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const incomingNotificationRef = useRef(null);
  const lastIncomingNotificationIdRef = useRef("");
  const lastSignalTsRef = useRef(new Date(0).toISOString());
  const callStateRef = useRef("idle");
  const callStartedAtRef = useRef(null);
  const processedSignalIdsRef = useRef(new Set());
  const handleSignalRef = useRef(null);

  const agoraClientRef = useRef(null);
  const localMicRef = useRef(null);
  const localCamRef = useRef(null);
  const remoteAudioTracksRef = useRef({});
  const remoteAudioElsRef = useRef({});
  /** Bumped on every leave/reset so in-flight join can exit without surfacing errors (Strict Mode / unmount). */
  const agoraSessionRef = useRef(0);
  const startOutgoingCallRef = useRef(async () => {});

  const roomId = chat?._id || "";
  const currentUserId = String(currentUser?._id || "");
  const participants = useMemo(
    () =>
      (chat?.participants || [])
        .map((p) => ({
          id: String(p._id),
          name: p.username,
          avatar: p.avatar || p.profileImage || p.image || "",
        }))
        .filter((p) => p.id !== currentUserId),
    [chat?.participants, currentUserId]
  );
  const participantsById = useMemo(
    () => Object.fromEntries(participants.map((p) => [p.id, p])),
    [participants]
  );
  const primaryRemote = participants[0] || null;
  const incomingCaller = incomingCall
    ? participantsById[incomingCall.fromUserId] || null
    : null;
  const firstRemoteVideoTrack =
    Object.values(remoteUsers).find((entry) => entry?.videoTrack)?.videoTrack || null;
  const remoteConnectedCount = Object.keys(remoteUsers).length;
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const callingStatus =
    callState === "active"
      ? remoteConnectedCount > 0
        ? "Connected"
        : "Connecting..."
      : callState === "incoming"
      ? "Incoming call"
      : isOnline
      ? "Ringing..."
      : "No internet connection";
  const callDurationLabel = `${String(Math.floor(callDurationSec / 60)).padStart(
    2,
    "0"
  )}:${String(callDurationSec % 60).padStart(2, "0")}`;

  const effectiveCallMode =
    callState === "incoming"
      ? incomingCall?.mode || "audio"
      : callMode || "audio";

  const playRingPulse = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const context = audioContextRef.current;
      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }

      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = "sine";
      osc.frequency.value = 860;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.3);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {}
  }, []);

  const stopRingingTone = useCallback(() => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
  }, []);

  const closeIncomingNotification = useCallback(() => {
    if (incomingNotificationRef.current) {
      try {
        incomingNotificationRef.current.close();
      } catch {}
      incomingNotificationRef.current = null;
    }
  }, []);

  const showIncomingNotification = useCallback(
    (callerName, mode, notificationId) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (!notificationId || lastIncomingNotificationIdRef.current === notificationId) return;
      lastIncomingNotificationIdRef.current = notificationId;

      const title = `${mode === "video" ? "Video" : "Audio"} call`;
      const body = `${callerName || "Someone"} is calling you`;

      const createNotification = () => {
        closeIncomingNotification();
        try {
          const notification = new Notification(title, { body, tag: `call-${notificationId}` });
          notification.onclick = () => {
            try {
              window.focus();
            } catch {}
            notification.close();
          };
          incomingNotificationRef.current = notification;
        } catch {}
      };

      if (Notification.permission === "granted") {
        createNotification();
        return;
      }

      if (Notification.permission === "default") {
        Notification.requestPermission()
          .then((permission) => {
            if (permission === "granted") {
              createNotification();
            }
          })
          .catch(() => {});
      }
    },
    [closeIncomingNotification]
  );

  const startOutgoingRingingTone = useCallback(() => {
    stopRingingTone();
    playRingPulse();
    ringtoneTimerRef.current = setInterval(playRingPulse, 1200);
  }, [playRingPulse, stopRingingTone]);

  const postSignal = useCallback(
    async ({ toUserId = null, signalType, payload = {} }) => {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/calls/signals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, toUserId, signalType, payload }),
      });
      if (!response.ok) {
        throw new Error(`Failed to send signal: ${signalType}`);
      }
    },
    [roomId]
  );

  const getDurationLabel = useCallback(() => {
    if (!callStartedAtRef.current) return null;
    const elapsedSec = Math.max(0, Math.floor((Date.now() - callStartedAtRef.current) / 1000));
    const minutes = Math.floor(elapsedSec / 60);
    const seconds = elapsedSec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, []);

  const logCallEvent = useCallback(
    async (text) => {
      if (!roomId || !text) return;
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chatId: roomId,
            content: text,
            messageType: "call",
          }),
        });
      } catch {}
    },
    [roomId]
  );

  const applySinkId = useCallback(async (audioElement, outputId) => {
    if (!audioElement || !outputId) return;
    if (typeof audioElement.setSinkId !== "function") return;
    try {
      await audioElement.setSinkId(outputId);
    } catch {}
  }, []);

  const playRemoteAudioTrack = useCallback(
    async (uid, audioTrack) => {
      if (!audioTrack) return;
      const key = String(uid);

      let audioElement = remoteAudioElsRef.current[key];
      if (!audioElement) {
        audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        audioElement.muted = false;
        audioElement.volume = 1;
        remoteAudioElsRef.current[key] = audioElement;
      }

      try {
        if (typeof audioTrack.getMediaStreamTrack === "function") {
          const mediaTrack = audioTrack.getMediaStreamTrack();
          if (mediaTrack) {
            audioElement.srcObject = new MediaStream([mediaTrack]);
            await applySinkId(audioElement, selectedOutputId);
            await audioElement.play();
            return;
          }
        }
      } catch {}

      try {
        // Fallback to Agora-managed playback if direct media track playback fails.
        audioTrack.play();
      } catch {}
    },
    [applySinkId, selectedOutputId]
  );

  const refreshMediaDevices = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      const inputs = devices.filter((device) => device.kind === "audioinput");
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setAudioOutputs(outputs);
      setAudioInputs(inputs);
      setVideoInputs(cameras);

      const airpods = outputs.find((device) => /airpods/i.test(device.label || ""));
      if (airpods?.deviceId) {
        setSelectedOutputId(airpods.deviceId);
      } else if (
        outputs.some((device) => device.deviceId === selectedOutputId)
      ) {
        // Keep existing selected output.
      } else if (outputs[0]?.deviceId) {
        setSelectedOutputId(outputs[0].deviceId);
      } else {
        setSelectedOutputId("default");
      }

      const preferredMic = inputs.find((device) =>
        /airpods|bluetooth/i.test(device.label || "")
      );
      if (preferredMic?.deviceId) {
        setSelectedInputId(preferredMic.deviceId);
      } else if (inputs.some((device) => device.deviceId === selectedInputId)) {
        // keep selected input
      } else if (inputs[0]?.deviceId) {
        setSelectedInputId(inputs[0].deviceId);
      } else {
        setSelectedInputId("default");
      }

      if (cameras.some((device) => device.deviceId === selectedCameraId)) {
        // keep selected camera
      } else if (cameras[0]?.deviceId) {
        setSelectedCameraId(cameras[0].deviceId);
      } else {
        setSelectedCameraId("default");
      }
    } catch {}
  }, [selectedCameraId, selectedInputId, selectedOutputId]);

  const leaveAgora = useCallback(async () => {
    agoraSessionRef.current += 1;
    const client = agoraClientRef.current;
    agoraClientRef.current = null;
    try {
      await client?.leave();
    } catch {}
    try {
      localMicRef.current?.close();
    } catch {}
    localMicRef.current = null;
    try {
      localCamRef.current?.close();
    } catch {}
    localCamRef.current = null;
    setHasLocalCamera(false);
    Object.values(remoteAudioTracksRef.current).forEach((track) => {
      try {
        track?.stop?.();
      } catch {}
    });
    Object.values(remoteAudioElsRef.current).forEach((audioElement) => {
      try {
        audioElement.pause();
        audioElement.srcObject = null;
      } catch {}
    });
    remoteAudioElsRef.current = {};
    remoteAudioTracksRef.current = {};
  }, []);

  const resetCallState = useCallback(async () => {
    stopRingingTone();
    closeIncomingNotification();
    await leaveAgora();
    // Do NOT clear processedSignalIdsRef here — GET uses since >= T and the same
    // call-start row can be returned again; clearing lets Chrome re-show "incoming".
    setRemoteUsers({});
    setCallMode(null);
    setIncomingCall(null);
    setCallState("idle");
    setIsMuted(false);
    setIsCameraOff(false);
    setHasLocalCamera(false);
    setCallStartedAt(null);
    setCallDurationSec(0);
    try {
      if (typeof navigator !== "undefined" && navigator.mediaSession) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }
    } catch {}
  }, [closeIncomingNotification, leaveAgora, stopRingingTone]);

  const joinAgoraAndPublish = useCallback(async (mode) => {
    const mySession = ++agoraSessionRef.current;
    const alive = () => agoraSessionRef.current === mySession;

    const cleanupPartial = async (client) => {
      try {
        if (client && agoraClientRef.current === client) {
          agoraClientRef.current = null;
        }
        await client?.leave();
      } catch {}
      try {
        localMicRef.current?.close();
      } catch {}
      localMicRef.current = null;
      try {
        localCamRef.current?.close();
      } catch {}
      localCamRef.current = null;
      setHasLocalCamera(false);
    };

    let client = null;
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      if (!alive()) return;

      // Release any stale local tracks from previous attempts before requesting devices.
      try {
        localMicRef.current?.close();
      } catch {}
      localMicRef.current = null;
      try {
        localCamRef.current?.close();
      } catch {}
      localCamRef.current = null;
      setHasLocalCamera(false);

      const authToken = localStorage.getItem("authToken");
      const response = await fetch("/api/agora/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ roomId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Could not join Agora channel");
      }
      if (!alive()) return;

      const { appId, token, uid, channelName } = data;

      const canOpenDevice = async (kind, deviceId) => {
        if (!navigator?.mediaDevices?.getUserMedia) return true;
        const constraints =
          kind === "audio"
            ? {
                audio:
                  deviceId && deviceId !== "default"
                    ? { deviceId: { exact: deviceId } }
                    : true,
                video: false,
              }
            : {
                audio: false,
                video:
                  deviceId && deviceId !== "default"
                    ? { deviceId: { exact: deviceId } }
                    : true,
              };
        try {
          const probe = await navigator.mediaDevices.getUserMedia(constraints);
          probe.getTracks().forEach((track) => track.stop());
          return true;
        } catch (error) {
          if (isDeviceBusyError(error)) return false;
          throw error;
        }
      };

      client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        if (!alive()) return;
        if (String(user.uid) === String(uid)) return;
        try {
          await client.subscribe(user, mediaType);
        } catch (err) {
          if (isAgoraCanceledError(err) || !alive()) return;
          throw err;
        }
        if (!alive()) return;
        setRemoteUsers((prev) => {
          const key = String(user.uid);
          const cur = prev[key] || { uid: user.uid };
          if (mediaType === "audio") {
            remoteAudioTracksRef.current[key] = user.audioTrack;
            void playRemoteAudioTrack(key, user.audioTrack);
            return { ...prev, [key]: { ...cur, audioTrack: user.audioTrack } };
          }
          if (mediaType === "video") {
            return { ...prev, [key]: { ...cur, videoTrack: user.videoTrack } };
          }
          return prev;
        });
        if (callStateRef.current === "ringing") {
          setCallState("active");
          setCallStartedAt(Date.now());
        }
        setMediaPlayNonce((n) => n + 1);
      });

      client.on("user-unpublished", (user, mediaType) => {
        setRemoteUsers((prev) => {
          const key = String(user.uid);
          const cur = prev[key];
          if (!cur) return prev;
          const next = { ...cur };
          if (mediaType === "audio") {
            try {
              remoteAudioTracksRef.current[key]?.stop?.();
            } catch {}
            try {
              remoteAudioElsRef.current[key]?.pause();
              remoteAudioElsRef.current[key].srcObject = null;
            } catch {}
            delete remoteAudioElsRef.current[key];
            delete remoteAudioTracksRef.current[key];
            delete next.audioTrack;
          }
          if (mediaType === "video") delete next.videoTrack;
          if (!next.audioTrack && !next.videoTrack) {
            const { [key]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [key]: next };
        });
        setMediaPlayNonce((n) => n + 1);
      });

      client.on("user-left", (user) => {
        const key = String(user.uid);
        try {
          remoteAudioTracksRef.current[key]?.stop?.();
        } catch {}
        try {
          remoteAudioElsRef.current[key]?.pause();
          remoteAudioElsRef.current[key].srcObject = null;
        } catch {}
        delete remoteAudioElsRef.current[key];
        delete remoteAudioTracksRef.current[key];
        setRemoteUsers((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
        setMediaPlayNonce((n) => n + 1);
      });

      await client.join(appId, channelName, token, uid);
      if (!alive()) {
        await cleanupPartial(client);
        return;
      }

      const buildMicTrack = async () => {
        const micConfig =
          selectedInputId && selectedInputId !== "default"
            ? { microphoneId: selectedInputId }
            : undefined;
        const micReadable = await canOpenDevice("audio", selectedInputId);
        if (!micReadable) return null;
        try {
          return await AgoraRTC.createMicrophoneAudioTrack(micConfig);
        } catch (error) {
          if (!isDeviceBusyError(error)) throw error;
          try {
            // Retry once with default microphone if selected device is busy.
            return await AgoraRTC.createMicrophoneAudioTrack();
          } catch (retryError) {
            if (!isDeviceBusyError(retryError)) throw retryError;
            return null;
          }
        }
      };

      const buildCameraTrack = async () => {
        const candidateIds = [];
        if (selectedCameraId && selectedCameraId !== "default") {
          candidateIds.push(selectedCameraId);
        }
        videoInputs.forEach((camera) => {
          if (!camera?.deviceId || candidateIds.includes(camera.deviceId)) return;
          candidateIds.push(camera.deviceId);
        });
        if (candidateIds.length === 0) candidateIds.push("default");

        for (const cameraId of candidateIds) {
          const cameraReadable = await canOpenDevice("video", cameraId);
          if (!cameraReadable) continue;
          const camConfig =
            cameraId && cameraId !== "default" ? { cameraId } : undefined;
          try {
            if (cameraId !== selectedCameraId && cameraId !== "default") {
              setSelectedCameraId(cameraId);
            }
            return await AgoraRTC.createCameraVideoTrack(camConfig);
          } catch (error) {
            if (!isDeviceBusyError(error)) throw error;
          }
        }
        return null;
      };

      const mic = await buildMicTrack();
      if (!alive()) {
        try {
          mic?.close?.();
        } catch {}
        await cleanupPartial(client);
        return;
      }
      const tracks = [];
      if (mic) {
        localMicRef.current = mic;
        try {
          // Ensure mic track is actively sending from the start.
          mic.setEnabled(true);
        } catch {}
        tracks.push(mic);
      } else {
        setError("Microphone busy. Joined in listen-only mode.");
      }

      if (mode === "video") {
        const cam = await buildCameraTrack();
        if (!alive()) {
          try {
            mic?.close?.();
          } catch {}
          try {
            cam?.close?.();
          } catch {}
          await cleanupPartial(client);
          return;
        }
        if (cam) {
          localCamRef.current = cam;
          setHasLocalCamera(true);
          try {
            cam.setEnabled(true);
          } catch {}
          tracks.push(cam);
        } else {
          setHasLocalCamera(false);
          setError((prev) =>
            prev
              ? `${prev} Camera busy. Continuing without video.`
              : "Camera busy. Continuing without video."
          );
        }
      }

      if (tracks.length > 0) {
        await client.publish(tracks);
      }
      if (!alive()) {
        await cleanupPartial(client);
        return;
      }

      if (mode === "video" && localCamRef.current) {
        requestAnimationFrame(() => {
          if (localVideoContainerRef.current && localCamRef.current) {
            localCamRef.current.play(localVideoContainerRef.current);
          }
        });
      }
      await refreshMediaDevices();
    } catch (err) {
      if (!alive() || isAgoraCanceledError(err)) {
        await cleanupPartial(client);
        return;
      }
      await cleanupPartial(client);
      throw err;
    }
  }, [
    playRemoteAudioTrack,
    refreshMediaDevices,
    roomId,
    selectedCameraId,
    selectedInputId,
    videoInputs,
  ]);

  const startOutgoingCall = async (mode) => {
    if (!roomId) return;
    setError("");
    try {
      setMediaPlayNonce((n) => n + 1);
      setCallMode(mode);
      setCallState("ringing");
      setCallStartedAt(Date.now());
      if (mode === "audio") {
        startOutgoingRingingTone();
      }
      await logCallEvent(`Outgoing ${mode} call started`);

      await postSignal({
        signalType: "call-start",
        payload: { mode },
      });

      await joinAgoraAndPublish(mode);
      setCallState("active");
    } catch (err) {
      if (isAgoraCanceledError(err)) {
        await resetCallState();
        return;
      }
      setError(
        String(err?.message || "").includes("Agora")
          ? String(err.message)
          : "Could not start call. Check microphone/camera permissions and Agora setup."
      );
      await resetCallState();
    }
  };
  startOutgoingCallRef.current = startOutgoingCall;

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    setError("");
    try {
      const mode = incomingCall.mode || "audio";
      await logCallEvent(`Incoming ${mode} call accepted`);
      setMediaPlayNonce((n) => n + 1);
      setCallMode(mode);
      setIncomingCall(null);
      setCallState("active");
      setCallStartedAt(Date.now());
      await joinAgoraAndPublish(mode);
    } catch (error) {
      if (isAgoraCanceledError(error)) {
        await resetCallState();
        return;
      }
      setError(
        String(error?.message || "") ||
          "Could not accept call. Check permissions and Agora setup."
      );
      await resetCallState();
    }
  };

  const endCall = async () => {
    const durationLabel = getDurationLabel();
    await logCallEvent(
      durationLabel ? `Call ended (${durationLabel})` : "Call ended"
    );
    await postSignal({ signalType: "hangup", payload: {} }).catch(() => {});
    await resetCallState();
  };

  const dismissIncoming = async () => {
    await logCallEvent("Missed incoming call");
    stopRingingTone();
    closeIncomingNotification();
    // Clear UI immediately so Drop never waits on network / Agora leave (fixes sticky panel).
    callStateRef.current = "idle";
    setIncomingCall(null);
    setCallMode(null);
    setCallState("idle");
    setRemoteUsers({});
    setIsMuted(false);
    setIsCameraOff(false);
    setError("");
    try {
      if (typeof navigator !== "undefined" && navigator.mediaSession) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }
    } catch {}
    try {
      await postSignal({ signalType: "hangup", payload: {} });
    } catch {}
    await leaveAgora();
  };

  const handleSignal = useCallback(
    async (signal) => {
      const { signalType, payload } = signal;

      if (signalType === "call-start" && callStateRef.current === "idle") {
        const createdAtMs = new Date(signal.createdAt).getTime();
        const isFreshSignal =
          Number.isFinite(createdAtMs) &&
          Date.now() - createdAtMs <= 30 * 1000;
        if (!isFreshSignal) {
          return;
        }
        const fromUserId = String(signal.fromUserId);
        setIncomingCall({
          fromUserId,
          mode: payload?.mode || "audio",
          signalId: String(signal?._id || `${fromUserId}-${createdAtMs}`),
        });
        setCallState("incoming");
        return;
      }

      if (signalType === "hangup") {
        if (callStateRef.current !== "idle") {
          const durationLabel = getDurationLabel();
          await logCallEvent(
            durationLabel ? `Call ended (${durationLabel})` : "Call ended"
          );
        }
        await resetCallState();
      }
    },
    [getDurationLabel, logCallEvent, resetCallState]
  );

  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    processedSignalIdsRef.current = new Set();
    // On chat open/refresh, start near "now" so historical call-start rows
    // do not re-open incoming-call UI.
    lastSignalTsRef.current = new Date(Date.now() - 5000).toISOString();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const pollSignals = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `/api/calls/signals?roomId=${roomId}&since=${encodeURIComponent(
            lastSignalTsRef.current
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) return;
        const signals = await response.json();
        for (const signal of signals) {
          const signalId = String(signal?._id || "");
          if (signalId && processedSignalIdsRef.current.has(signalId)) {
            continue;
          }

          const type = signal.signalType;
          if (type === "call-start" || type === "hangup") {
            await handleSignalRef.current?.(signal);
          }

          if (signalId) {
            processedSignalIdsRef.current.add(signalId);
            if (processedSignalIdsRef.current.size > 1000) {
              const ids = Array.from(processedSignalIdsRef.current);
              processedSignalIdsRef.current = new Set(ids.slice(-500));
            }
          }

          const createdAt = new Date(signal.createdAt).toISOString();
          if (createdAt >= lastSignalTsRef.current) {
            lastSignalTsRef.current = createdAt;
          }
        }
      } catch {}
    };

    pollSignals();
    pollTimerRef.current = setInterval(pollSignals, 500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [roomId, currentUserId]);

  useEffect(() => {
    return () => {
      // Do not call resetCallState() here — it races join() and triggers OPERATION_ABORTED
      // (React Strict Mode remount is the usual case). Only release Agora + tracks.
      closeIncomingNotification();
      void leaveAgora();
    };
  }, [closeIncomingNotification, leaveAgora]);

  useEffect(() => {
    callStartedAtRef.current = callStartedAt;
  }, [callStartedAt]);

  useEffect(() => {
    if (!callStartedAt || callState !== "active") return;
    const tick = () => {
      setCallDurationSec(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [callStartedAt, callState]);

  useEffect(() => {
    const init = setTimeout(() => {
      void refreshMediaDevices();
    }, 0);
    if (!navigator?.mediaDevices?.addEventListener) return;
    const onDeviceChange = () => {
      void refreshMediaDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => {
      clearTimeout(init);
      navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    };
  }, [refreshMediaDevices]);

  useEffect(() => {
    if (callState === "incoming") {
      stopRingingTone();
      playRingPulse();
      ringtoneTimerRef.current = setInterval(playRingPulse, 1200);

      const mode = incomingCall?.mode || "audio";
      const callerName = incomingCaller?.name || "Unknown caller";
      const notificationId =
        incomingCall?.signalId || `${incomingCall?.fromUserId || "unknown"}-${mode}`;
      showIncomingNotification(callerName, mode, notificationId);
      return;
    }

    if (callState === "active" || callState === "idle") {
      stopRingingTone();
      closeIncomingNotification();
    }
  }, [
    callState,
    closeIncomingNotification,
    incomingCall,
    incomingCaller?.name,
    playRingPulse,
    showIncomingNotification,
    stopRingingTone,
  ]);

  useEffect(() => {
    Object.values(remoteUsers).forEach((entry) => {
      try {
        if (entry?.uid && entry.audioTrack) {
          void playRemoteAudioTrack(entry.uid, entry.audioTrack);
        }
      } catch {}
    });
  }, [mediaPlayNonce, playRemoteAudioTrack, remoteUsers]);

  useEffect(() => {
    if (callState !== "active") return;
    // In video calls, ensure remote audio is retried after connection stabilizes.
    const retry = setTimeout(() => {
      Object.values(remoteUsers).forEach((entry) => {
        if (entry?.uid && entry.audioTrack) {
          void playRemoteAudioTrack(entry.uid, entry.audioTrack);
        }
      });
    }, 1200);
    return () => clearTimeout(retry);
  }, [callState, playRemoteAudioTrack, remoteUsers]);

  useEffect(() => {
    Object.entries(remoteAudioTracksRef.current).forEach(([uid, track]) => {
      void playRemoteAudioTrack(uid, track);
    });
  }, [selectedOutputId, playRemoteAudioTrack]);

  const toggleMute = () => {
    setMediaPlayNonce((n) => n + 1);
    const track = localMicRef.current;
    if (!track) return;
    const next = !isMuted;
    track.setEnabled(!next);
    setIsMuted(next);
  };

  const toggleCamera = () => {
    const track = localCamRef.current;
    if (!track) return;
    const next = !isCameraOff;
    track.setEnabled(!next);
    setIsCameraOff(next);
  };

  const retryEnableCamera = async () => {
    const client = agoraClientRef.current;
    if (!client || callState !== "active") return;

    setIsRetryingCamera(true);
    try {
      const canOpenSelectedCamera = async (cameraId) => {
        if (!navigator?.mediaDevices?.getUserMedia) return true;
        try {
          const probe = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video:
              cameraId && cameraId !== "default"
                ? { deviceId: { exact: cameraId } }
                : true,
          });
          probe.getTracks().forEach((track) => track.stop());
          return true;
        } catch (error) {
          if (isDeviceBusyError(error)) return false;
          throw error;
        }
      };

      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const candidateIds = [];
      if (selectedCameraId && selectedCameraId !== "default") {
        candidateIds.push(selectedCameraId);
      }
      videoInputs.forEach((camera) => {
        if (!camera?.deviceId || candidateIds.includes(camera.deviceId)) return;
        candidateIds.push(camera.deviceId);
      });
      if (candidateIds.length === 0) candidateIds.push("default");

      let cam = null;
      let selectedUsed = selectedCameraId;
      for (const candidateId of candidateIds) {
        const readable = await canOpenSelectedCamera(candidateId);
        if (!readable) continue;
        const camConfig =
          candidateId && candidateId !== "default"
            ? { cameraId: candidateId }
            : undefined;
        try {
          cam = await AgoraRTC.createCameraVideoTrack(camConfig);
          selectedUsed = candidateId;
          break;
        } catch (error) {
          if (!isDeviceBusyError(error)) throw error;
        }
      }
      if (!cam) {
        setError("Camera still busy. Close other camera apps and tap Retry Camera.");
        return;
      }

      if (selectedUsed && selectedUsed !== selectedCameraId && selectedUsed !== "default") {
        setSelectedCameraId(selectedUsed);
      }
      await client.publish([cam]);
      localCamRef.current = cam;
      setHasLocalCamera(true);
      setIsCameraOff(false);
      setError("");

      requestAnimationFrame(() => {
        if (localVideoContainerRef.current && localCamRef.current) {
          localCamRef.current.play(localVideoContainerRef.current);
        }
      });
    } catch (error) {
      if (isDeviceBusyError(error)) {
        setError("Camera still busy. Close other camera apps and tap Retry Camera.");
      } else {
        setError("Could not enable camera right now. Please retry.");
      }
    } finally {
      setIsRetryingCamera(false);
    }
  };

  useEffect(() => {
    onActionsChange?.({
      canStart: callState === "idle",
      startAudio: () => startOutgoingCallRef.current("audio"),
      startVideo: () => startOutgoingCallRef.current("video"),
    });
    return () => onActionsChange?.(null);
  }, [callState, onActionsChange]);

  return (
    <div className="space-y-2 border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-4">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {callState !== "idle" && (
        <div className="rounded-xl bg-[#111b21] p-3 text-white">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-3">
            <img
              src={
                (callState === "incoming"
                  ? incomingCaller?.avatar
                  : primaryRemote?.avatar || chat?.avatar) ||
                "https://via.placeholder.com/48"
              }
              alt="Call user"
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {callState === "incoming"
                  ? incomingCaller?.name || "Unknown caller"
                  : primaryRemote?.name || chat?.name || "Calling"}
              </p>
              <p className="text-xs text-white/70">{callingStatus}</p>
              {callState === "active" && (
                <p className="text-xs font-semibold text-emerald-300">
                  Call time {callDurationLabel}
                </p>
              )}
            </div>
            <span className="text-[11px] text-white/70">
              {effectiveCallMode === "video" ? "Video" : "Audio"}
            </span>
          </div>

          {effectiveCallMode === "video" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative h-52 w-full overflow-hidden rounded-lg bg-black sm:h-[42vh]">
                <div
                  ref={localVideoContainerRef}
                  className="h-full w-full bg-black"
                />
                {(!hasLocalCamera || isCameraOff) && (
                  <AvatarFallback
                    imageUrl={currentUser?.avatar || currentUser?.profileImage || currentUser?.image}
                    label={currentUser?.username || "You"}
                  />
                )}
              </div>
              <div className="relative h-52 w-full overflow-hidden rounded-lg bg-black sm:h-[42vh]">
                {firstRemoteVideoTrack ? (
                  <AgoraRemoteVideo videoTrack={firstRemoteVideoTrack} />
                ) : (
                  <AvatarFallback
                    imageUrl={primaryRemote?.avatar || chat?.avatar}
                    label={primaryRemote?.name || chat?.name || "Receiver"}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/30" />
              <div className="h-12 w-12 rounded-full bg-emerald-500/50" />
              <div className="h-12 w-12 rounded-full bg-emerald-500/30" />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {incomingCall && callState === "incoming" ? (
              <>
                <button
                  onClick={acceptIncomingCall}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Pick call
                </button>
                <button
                  onClick={dismissIncoming}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  Drop call
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-xs"
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                {callMode === "video" && (
                  <>
                    {hasLocalCamera ? (
                      <button
                        onClick={toggleCamera}
                        className="rounded-full bg-white/15 px-3 py-1.5 text-xs"
                      >
                        {isCameraOff ? "Camera On" : "Camera Off"}
                      </button>
                    ) : (
                      <button
                        onClick={retryEnableCamera}
                        disabled={isRetryingCamera}
                        className="rounded-full bg-indigo-500/70 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {isRetryingCamera ? "Retrying..." : "Retry Camera"}
                      </button>
                    )}
                  </>
                )}
                {callState === "active" && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                    {callDurationLabel}
                  </span>
                )}
                <button
                  onClick={endCall}
                  className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold"
                >
                  End
                </button>
              </>
            )}
          </div>

          {!incomingCall &&
            callState !== "idle" &&
            (audioOutputs.length > 0 ||
              audioInputs.length > 0 ||
              videoInputs.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/80">
                {audioInputs.length > 0 && (
                  <>
                    <span>Mic:</span>
                    <select
                      value={selectedInputId}
                      onChange={(event) => setSelectedInputId(event.target.value)}
                      className="rounded border border-white/30 bg-white/10 px-2 py-1 text-xs text-white"
                    >
                      {audioInputs.map((input) => (
                        <option key={input.deviceId} value={input.deviceId} className="text-black">
                          {input.label || `Mic ${input.deviceId.slice(0, 6)}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {audioOutputs.length > 0 && (
                  <>
                    <span>Speaker:</span>
                    <select
                      value={selectedOutputId}
                      onChange={(event) => setSelectedOutputId(event.target.value)}
                      className="rounded border border-white/30 bg-white/10 px-2 py-1 text-xs text-white"
                    >
                      {audioOutputs.map((output) => (
                        <option key={output.deviceId} value={output.deviceId} className="text-black">
                          {output.label || `Output ${output.deviceId.slice(0, 6)}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {videoInputs.length > 0 && (
                  <>
                    <span>Camera:</span>
                    <select
                      value={selectedCameraId}
                      onChange={(event) => setSelectedCameraId(event.target.value)}
                      className="rounded border border-white/30 bg-white/10 px-2 py-1 text-xs text-white"
                    >
                      {videoInputs.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId} className="text-black">
                          {camera.label || `Camera ${camera.deviceId.slice(0, 6)}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function AgoraRemoteVideo({ videoTrack }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !videoTrack) return;
    videoTrack.play(containerRef.current);
    return () => {
      try {
        videoTrack.stop();
      } catch {}
    };
  }, [videoTrack]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-black"
    />
  );
}

function AvatarFallback({ imageUrl, label }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
      <img
        src={imageUrl || "https://via.placeholder.com/96"}
        alt={label}
        className="h-14 w-14 rounded-full border border-white/30 object-cover"
      />
      <span className="text-xs text-white/90">{label}</span>
    </div>
  );
}
