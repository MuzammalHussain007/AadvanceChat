import { NextResponse } from "next/server";

const getLocalReply = (latestMessage) => {
  const text = latestMessage.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return "Please type a message so I can help you.";
  }

  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I am your local chatbot. Ask me about coding, planning, or debugging.";
  }

  if (lower.includes("help")) {
    return (
      "I can help with:\n" +
      "- JavaScript and React questions\n" +
      "- Next.js project structure\n" +
      "- Debugging step-by-step\n" +
      "- Basic learning plans"
    );
  }

  if (lower.includes("next.js") || lower.includes("nextjs")) {
    return (
      "Next.js is a React framework that supports routing, server rendering, and API routes.\n" +
      "In this app, your UI is in `app/page.js` and chatbot API logic is in `app/api/chat/route.js`."
    );
  }

  if (lower.includes("tailwind")) {
    return (
      "Tailwind CSS gives utility classes like `flex`, `px-4`, and `bg-slate-900`.\n" +
      "You can customize styles directly in your JSX class names."
    );
  }

  if (lower.includes("bye")) {
    return "Goodbye! Come back anytime.";
  }

  return (
    `You asked: "${text}"\n\n` +
    "I am currently running in local no-key mode, so my replies are rule-based. " +
    "If you want real AI generation later, I can switch this to Ollama."
  );
};

export async function POST(request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required." },
        { status: 400 }
      );
    }

    const latestUserMessage = messages[messages.length - 1]?.content || "";
    return NextResponse.json({ reply: getLocalReply(latestUserMessage) });
  } catch {
    return NextResponse.json({
      reply:
        "Unexpected server error while processing your message. Please try again.",
    });
  }
}
