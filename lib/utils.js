// Utility functions for the chat app

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: new Date(date).getFullYear() !== new Date().getFullYear()
      ? "numeric"
      : undefined,
  });
};

export const isToday = (date) => {
  const today = new Date();
  const messageDate = new Date(date);
  return (
    today.getFullYear() === messageDate.getFullYear() &&
    today.getMonth() === messageDate.getMonth() &&
    today.getDate() === messageDate.getDate()
  );
};

export const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date);
  return (
    yesterday.getFullYear() === messageDate.getFullYear() &&
    yesterday.getMonth() === messageDate.getMonth() &&
    yesterday.getDate() === messageDate.getDate()
  );
};

export const formatMessageTime = (date) => {
  if (isToday(date)) {
    return formatTime(date);
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return formatDate(date);
  }
};

export const getFileExtension = (filename) => {
  return filename.split(".").pop().toLowerCase();
};

export const getFileIcon = (filename) => {
  const ext = getFileExtension(filename);
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
  const docExts = ["pdf", "doc", "docx", "txt", "xls", "xlsx"];

  if (imageExts.includes(ext)) return "📷";
  if (docExts.includes(ext)) return "📄";
  return "📎";
};

export const truncateFileName = (filename, maxLength = 20) => {
  if (filename.length <= maxLength) return filename;
  const ext = getFileExtension(filename);
  const nameWithoutExt = filename.substring(0, filename.length - ext.length - 1);
  const truncated =
    nameWithoutExt.substring(0, maxLength - ext.length - 4) + "...";
  return truncated + "." + ext;
};
