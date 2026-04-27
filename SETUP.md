# Multi-User Chat Application

A modern, feature-rich real-time chat application built with Next.js, React, MongoDB, and WebSockets. Support for emoji reactions, file uploads, image sharing, and voice messages.

## Features

✨ **Core Features**
- 🔐 User Authentication (Register/Login with JWT)
- 💬 Real-time Multi-user Chat
- 👥 Group Chat Support
- 🎨 Emoji Picker Integration
- 📸 Image/File Upload Support
- 🎙️ Voice Message Recording
- 👤 User Profiles & Status
- 🔔 Message Notifications
- 🔍 Search Conversations
- ⌚ Last Seen & Online Status

## Tech Stack

**Frontend:**
- Next.js 16.2.4
- React 19.2.4
- Tailwind CSS
- Socket.io Client (for real-time messaging)
- emoji-picker-react
- Axios

**Backend:**
- Next.js API Routes
- MongoDB
- Mongoose ODM
- JWT Authentication
- bcryptjs for Password Hashing

**Deployment Ready:**
- Environment-based configuration
- Error handling
- Security best practices

## Installation

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Step 1: Clone and Install Dependencies

```bash
cd ai-chatbot
npm install
```

### Step 2: Configure Environment Variables

Update `.env.local` with your configuration:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/chatapp
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# OpenAI API (Optional, for future AI features)
OPENAI_API_KEY=your_api_key_here

# Environment
NODE_ENV=development
```

### Step 3: Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas:**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get your connection string
- Update MONGODB_URI in .env.local

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-chatbot/
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   │   ├── login/route.js
│   │   │   ├── register/route.js
│   │   │   └── logout/route.js
│   │   ├── chats/route.js      # Chat endpoints
│   │   ├── messages/route.js   # Message endpoints
│   │   └── upload/route.js     # File upload endpoint
│   ├── chat/
│   │   └── page.js             # Main chat interface
│   ├── login/
│   │   └── page.js             # Login page
│   ├── register/
│   │   └── page.js             # Register page
│   ├── page.js                 # Home/redirect
│   └── layout.js               # Root layout
├── components/
│   ├── Login.js                # Login component
│   ├── Register.js             # Register component
│   ├── ChatList.js             # Chat list sidebar
│   ├── ChatWindow.js           # Main chat window
│   ├── Message.js              # Message display
│   └── MessageInput.js         # Message input with features
├── models/
│   ├── User.js                 # User schema
│   ├── Chat.js                 # Chat schema
│   └── Message.js              # Message schema
├── lib/
│   ├── mongodb.js              # MongoDB connection
│   └── auth.js                 # JWT & auth utilities
├── public/
│   └── uploads/                # User uploads directory
└── .env.local                  # Environment variables
```

## Usage

### 1. Register a New Account
- Go to `/register`
- Fill in username, email, and password
- Submit to create account

### 2. Login
- Go to `/login`
- Enter your credentials
- Access the chat interface

### 3. Start Chatting
- Select an existing chat or create a new one
- Send text messages
- Use emoji picker (😊 button)
- Upload files/images (📎 button)
- Record voice messages (🎤 button)

### 4. Features

**Emoji Support:**
- Click the emoji button to open picker
- Select emoji to add to message

**File/Image Upload:**
- Click the attachment button
- Select image, PDF, or document
- File is automatically uploaded and shared

**Voice Messages:**
- Click the microphone button to start recording
- Click again to stop and send
- Supports WebM audio format

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Chats
- `GET /api/chats` - Get all user's chats
- `POST /api/chats` - Create new chat/group

### Messages
- `GET /api/messages?chatId=ID` - Get chat messages
- `POST /api/messages` - Send message

### Upload
- `POST /api/upload` - Upload file/image/voice

## Security Features

✅ JWT-based authentication
✅ Password hashing with bcryptjs
✅ Protected API routes
✅ Secure cookie handling
✅ Input validation
✅ XSS protection (Next.js built-in)

## Future Enhancements

- [ ] WebSocket integration for real-time updates
- [ ] Typing indicators
- [ ] Message read receipts
- [ ] User blocking
- [ ] Chat encryption
- [ ] Video/Audio calls
- [ ] Desktop notifications
- [ ] Mobile app (React Native)
- [ ] Dark mode toggle
- [ ] End-to-end encryption

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/chatapp |
| JWT_SECRET | Secret key for JWT tokens | your-secret-key |
| NODE_ENV | Environment | development |
| OPENAI_API_KEY | OpenAI API key (optional) | sk-... |

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env.local
- For Atlas, verify IP whitelist

### Upload Directory Issues
- Ensure `/public/uploads/` directory exists
- Check file permissions on the directory
- Files should be readable/writable

### Port Already in Use
```bash
# Linux/Mac: Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Windows: Use different port
npm run dev -- -p 3001
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review MongoDB documentation
3. Check Next.js docs
4. Open an issue on GitHub

---

**Happy Chatting! 💬**
