# Multi-User Chat Application

A modern, feature-rich real-time chat application built with Next.js, React, MongoDB, and WebSockets. Support for emoji reactions, file uploads, image sharing, and voice messages - just like WhatsApp! 🚀

## 🎯 Quick Links

- ⚡ [Quick Start](./QUICKSTART.md) - Get up and running in 5 minutes
- 📚 [Setup Guide](./SETUP.md) - Detailed installation instructions  
- ⚙️ [Configuration](./CONFIG.md) - Environment variables & database schemas
- 🚀 [Deployment](./DEPLOY.md) - Production deployment guide

---

## ✨ Features

### 💬 Core Chat Features
- **Real-time Messaging**: Instant message delivery between users
- **Multi-User Support**: Chat with multiple users and groups
- **Direct Messages**: 1-on-1 private conversations
- **Group Chats**: Create and manage group conversations
- **User Status**: Online/Offline/Away status indicators
- **Last Seen**: Track when users were last active

### 📱 Message Types
- **Text Messages**: Rich text communication
- **Emoji Support**: Built-in emoji picker with hundreds of emojis
- **Image Sharing**: Send and view images directly in chat
- **File Uploads**: Share PDFs, documents, and other files
- **Voice Messages**: Record and send voice notes like WhatsApp
- **Message Reactions**: React to messages with emojis

### 🔐 Security & Authentication
- **User Registration**: Create new accounts with email verification
- **Secure Login**: JWT-based authentication
- **Password Security**: bcryptjs hashing
- **Protected Routes**: Private conversations

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface with Tailwind CSS
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Chat Sidebar**: Quick access to all conversations
- **User Profiles**: View user information and status
- **Search**: Find chats by name or participant

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Next.js 16 + Tailwind CSS |
| **Backend** | Next.js API Routes + Node.js |
| **Database** | MongoDB + Mongoose |
| **Authentication** | JWT + bcryptjs |
| **Real-time** | Socket.io (WebSocket support) |
| **UI Components** | emoji-picker-react, custom components |
| **File Upload** | FormData + Local/S3 storage |
| **Voice** | Browser MediaRecorder API |

---

## 📦 Installation

### Prerequisites
- **Node.js 18+** (from nodejs.org)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **npm** (comes with Node.js)

### Step 1: Clone and Install

```bash
cd ai-chatbot
npm install
```

### Step 2: Setup Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your settings:

```env
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=generate-strong-random-key
NODE_ENV=development
```

### Step 3: Start MongoDB

```bash
# Local installation
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env.local
```

### Step 4: Seed Sample Data (Optional)

```bash
npm run seed
```

Creates test users:
- alice / alice@example.com / password123
- bob / bob@example.com / password123
- charlie / charlie@example.com / password123

### Step 5: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Getting Started

### 1. Create an Account
- Go to `/register`
- Enter username, email, and password
- Click "Register"

### 2. Login
- Go to `/login`
- Enter email and password
- Access chat interface

### 3. Start Chatting
- Select a chat or create a new one
- Send messages, add emojis, upload files, or record voice messages
- See messages in real-time!

### 4. Send Different Message Types

**Text Message**
```
Type message and press Enter
```

**Emoji** 😊
```
1. Click emoji button (😊)
2. Select emoji
3. Send
```

**File/Image** 📎
```
1. Click attachment button
2. Choose file
3. Auto-uploads
```

**Voice Message** 🎤
```
1. Click microphone to START recording
2. Speak your message
3. Click microphone to STOP & send
```

---

## 📚 Project Structure

```
ai-chatbot/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── chats/                # Chat management
│   │   ├── messages/             # Message operations
│   │   └── upload/               # File upload handler
│   ├── chat/                     # Main chat page
│   ├── login/                    # Login page
│   ├── register/                 # Register page
│   ├── layout.js                 # Root layout
│   └── page.js                   # Home/redirect
│
├── components/                   # React components
│   ├── Login.js                  # Login component
│   ├── Register.js               # Register component
│   ├── ChatList.js               # Chat sidebar
│   ├── ChatWindow.js             # Main chat area
│   ├── Message.js                # Message display
│   └── MessageInput.js           # Message input + features
│
├── models/                       # MongoDB schemas
│   ├── User.js                   # User schema
│   ├── Chat.js                   # Chat schema
│   └── Message.js                # Message schema
│
├── lib/                          # Utilities
│   ├── mongodb.js                # DB connection
│   ├── auth.js                   # JWT & auth
│   └── utils.js                  # Helper functions
│
├── public/
│   └── uploads/                  # User uploads
│
├── scripts/
│   └── seed.js                   # Sample data
│
├── middleware.js                 # Route protection
├── .env.local                    # Environment variables
└── QUICKSTART.md                 # Quick start guide
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get all user chats |
| POST | `/api/chats` | Create new chat |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages?chatId=ID` | Get messages |
| POST | `/api/messages` | Send message |

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file/image/voice |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | Database connection | `mongodb://localhost:27017/chatapp` |
| `JWT_SECRET` | Token signing key | `your-32-char-secret-key` |
| `NODE_ENV` | Environment mode | `development` |
| `OPENAI_API_KEY` | AI features (optional) | `sk-...` |

See [CONFIG.md](./CONFIG.md) for detailed information.

---

## 🔒 Security Features

✅ **Password Security**
- Passwords hashed with bcryptjs
- Minimum 6 characters required
- Never stored in plain text

✅ **Authentication**
- JWT tokens with 7-day expiration
- HTTP-only secure cookies
- Protected API routes

✅ **Data Protection**
- Input validation on all endpoints
- File type validation for uploads
- User data isolation per account

✅ **Best Practices**
- Environment variables for secrets
- Prepared database queries
- Error handling without leaking info

---

## 🚀 Deployment

### Quick Deploy to Vercel
```bash
npm install -g vercel
vercel
```

See [DEPLOY.md](./DEPLOY.md) for:
- Vercel deployment
- Docker containerization
- Manual server setup
- SSL/HTTPS configuration
- CI/CD pipelines

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
mongod

# Or check connection string in .env.local
MONGODB_URI=mongodb://localhost:27017/chatapp
```

### Port 3000 Already in Use
```bash
# Linux/Mac: Kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### File Upload Not Working
- Check `/public/uploads/` exists
- Verify write permissions: `chmod 755 public/uploads`
- Check file size (max 50MB)

See [QUICKSTART.md](./QUICKSTART.md) for more troubleshooting tips.

---

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[SETUP.md](./SETUP.md)** - Detailed installation
- **[CONFIG.md](./CONFIG.md)** - Configuration reference
- **[DEPLOY.md](./DEPLOY.md)** - Production deployment

---

## 🚀 Next Steps

1. ✅ Follow [QUICKSTART.md](./QUICKSTART.md)
2. ✅ Create test accounts and chat with yourself
3. ✅ Try all features (emoji, files, voice)
4. ✅ Customize colors and branding
5. ✅ Deploy to production

---

## 📋 Features Roadmap

- [x] Multi-user chat
- [x] Text messages
- [x] Emoji support
- [x] File uploads
- [x] Voice messages
- [ ] Real-time WebSocket integration
- [ ] Typing indicators
- [ ] Message search
- [ ] End-to-end encryption
- [ ] Video calls
- [ ] Dark mode
- [ ] Mobile app

---

## 📜 License

MIT License - Use freely in your projects

---

## 🤝 Support

Having issues?

1. Check [QUICKSTART.md](./QUICKSTART.md) troubleshooting
2. Review [CONFIG.md](./CONFIG.md) for setup help
3. Check [DEPLOY.md](./DEPLOY.md) for production issues
4. Review application logs for errors

---

## 💡 Contributing

Found a bug or have a feature idea?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Happy chatting! 💬**

Built with ❤️ using Next.js, React, and MongoDB
