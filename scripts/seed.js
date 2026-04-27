import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Chat from "@/models/Chat";
import Message from "@/models/Message";

async function seedDatabase() {
  try {
    await connectDB();

    console.log("🌱 Seeding database...");

    // Clear existing data
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});

    // Create sample users
    const users = await User.insertMany([
      {
        username: "alice",
        email: "alice@example.com",
        password: "password123",
        status: "online",
      },
      {
        username: "bob",
        email: "bob@example.com",
        password: "password123",
        status: "online",
      },
      {
        username: "charlie",
        email: "charlie@example.com",
        password: "password123",
        status: "offline",
      },
    ]);

    console.log("✅ Users created:", users.length);

    // Create sample chats
    const chats = await Chat.insertMany([
      {
        name: "Alice & Bob",
        participants: [users[0]._id, users[1]._id],
        isGroupChat: false,
      },
      {
        name: "Group Chat",
        participants: [users[0]._id, users[1]._id, users[2]._id],
        isGroupChat: true,
        admin: users[0]._id,
      },
    ]);

    console.log("✅ Chats created:", chats.length);

    // Create sample messages
    const messages = await Message.insertMany([
      {
        chatId: chats[0]._id,
        senderId: users[0]._id,
        senderName: users[0].username,
        content: "Hey Bob! How are you?",
        messageType: "text",
      },
      {
        chatId: chats[0]._id,
        senderId: users[1]._id,
        senderName: users[1].username,
        content: "Hi Alice! I'm doing great 😊",
        messageType: "text",
      },
      {
        chatId: chats[1]._id,
        senderId: users[0]._id,
        senderName: users[0].username,
        content: "Welcome to our group chat everyone!",
        messageType: "text",
      },
    ]);

    console.log("✅ Messages created:", messages.length);

    // Update chats with last message
    await Chat.findByIdAndUpdate(chats[0]._id, {
      lastMessage: messages[1]._id,
      lastMessageTime: messages[1].createdAt,
    });

    await Chat.findByIdAndUpdate(chats[1]._id, {
      lastMessage: messages[2]._id,
      lastMessageTime: messages[2].createdAt,
    });

    console.log("✅ Database seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedDatabase();
