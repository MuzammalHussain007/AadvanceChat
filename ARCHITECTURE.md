# Architecture & System Design

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   WEB BROWSER (Client)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React Components (Frontend)            │  │
│  │  ┌──────────────┐ ┌──────────────────────────┐  │  │
│  │  │  Login Form  │ │    Chat Interface       │  │  │
│  │  │  - Register  │ │  ┌──────────────────┐   │  │  │
│  │  │  - Login     │ │  │ ChatList (Left)  │   │  │  │
│  │  │              │ │  │ ChatWindow(Main) │   │  │  │
│  │  │              │ │  │ MessageInput     │   │  │  │
│  │  └──────────────┘ │  └──────────────────┘   │  │  │
│  └──────────────────────────────────────────────────────│
│                      ↕ HTTP/REST ↕                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Next.js Server (Backend)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         API Routes (app/api/)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐    │  │
│  │  │   Auth   │ │  Chats   │ │  Messages    │    │  │
│  │  │ - Login  │ │ - Get    │ │ - Get        │    │  │
│  │  │ - Logout │ │ - Create │ │ - Send       │    │  │
│  │  │ - Reg.   │ │          │ │ - Delete     │    │  │
│  │  └──────────┘ └──────────┘ └──────────────┘    │  │
│  │  ┌──────────────┐                               │  │
│  │  │   Upload     │ JWT Verification              │  │
│  │  │ - Files      │ Request Validation            │  │
│  │  │ - Images     │ Error Handling                │  │
│  │  │ - Voice      │                               │  │
│  │  └──────────────┘                               │  │
│  └──────────────────────────────────────────────────┘
│                      ↕ Driver ↕                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              MongoDB Database                           │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │  Users       │ │  Chats       │ │  Messages      │  │
│  │  - _id       │ │  - _id       │ │  - _id         │  │
│  │  - username  │ │  - name      │ │  - chatId      │  │
│  │  - email     │ │  - participants  │ - senderId  │  │
│  │  - password  │ │  - isGroupChat   │ - content   │  │
│  │  - avatar    │ │  - admin     │ │  - type        │  │
│  │  - status    │ │  - avatar    │ │  - mediaUrl    │  │
│  │              │ │  - lastMsg   │ │  - createdAt   │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
│  Indexes: User(email,username), Chats(participants),   │
│           Messages(chatId,createdAt)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           File Storage (/public/uploads/)               │
│  ├── User_Uploads/                                     │
│  │   ├── images/  (jpg, png, gif, webp)               │
│  │   ├── documents/ (pdf, doc, docx, txt)             │
│  │   └── voice/  (webm audio files)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. User Registration Flow

```
┌──────────────────────┐
│  User Registration   │
│  Form               │
└──────────┬───────────┘
           ↓
┌──────────────────────────┐
│ Validate Input           │
│ - Check username length  │
│ - Validate email format  │
│ - Check password match   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ POST /api/auth/register  │
│ Send: username, email,   │
│ password                 │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Server Validation        │
│ - Check if user exists   │
│ - Validate input data    │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Hash Password            │
│ bcryptjs (10 rounds)     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Save User to MongoDB     │
│ (Auto-indexed)           │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Generate JWT Token       │
│ Expires: 7 days          │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Set Auth Cookie          │
│ HTTP-only, Secure        │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Return Token & User Info │
│ Redirect to /chat        │
└──────────────────────────┘
```

### 2. Send Message Flow

```
┌──────────────────────┐
│ User Types Message   │
│ and Presses Enter    │
└──────────┬───────────┘
           ↓
┌──────────────────────────┐
│ Validate Message         │
│ - Not empty              │
│ - Check chatId           │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ POST /api/messages       │
│ Headers: JWT Token       │
│ Body: message data       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Verify JWT Token         │
│ Extract userId           │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Get User Info            │
│ (username, avatar)       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Create Message Object    │
│ - Add timestamps         │
│ - Add sender info        │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Save to MongoDB          │
│ Messages Collection      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Update Chat             │
│ - lastMessage ID        │
│ - lastMessageTime       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Return Message Object    │
│ (201 Created)            │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Frontend Receives        │
│ - Add to state           │
│ - Render in UI           │
│ - Auto-scroll down       │
└──────────────────────────┘
```

### 3. File Upload Flow

```
┌──────────────────────┐
│ User Selects File    │
│ (image/doc/voice)    │
└──────────┬───────────┘
           ↓
┌──────────────────────────┐
│ Validate File            │
│ - Check type             │
│ - Check size (<50MB)     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Create FormData          │
│ Append: file, chatId     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ POST /api/upload         │
│ Headers: JWT Token       │
│ Body: FormData           │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Verify JWT Token         │
│ Check authentication     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Generate Filename        │
│ timestamp-original.ext   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Save File to Disk        │
│ /public/uploads/         │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Return URL               │
│ /uploads/filename.ext    │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Frontend Receives URL    │
│ - Add to message         │
│ - Set messageType        │
│ - Send as message        │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ POST /api/messages       │
│ With mediaUrl            │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Message Saved            │
│ File accessible in chat  │
└──────────────────────────┘
```

### 4. Voice Recording Flow

```
┌──────────────────────┐
│ User Clicks 🎤 Button │
└──────────┬───────────┘
           ↓
┌──────────────────────────┐
│ Request Microphone       │
│ navigator.mediaDevices   │
│ .getUserMedia({audio})   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ User Grants Permission   │
│ (Browser Dialog)         │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Start MediaRecorder      │
│ Recording = true         │
│ UI shows "Stop 🎙️"      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ User Speaks              │
│ Audio being recorded     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ User Clicks 🎤 Again     │
│ (to Stop)                │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Stop MediaRecorder       │
│ Collect audio chunks     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Convert to Blob          │
│ Type: audio/webm         │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ POST /api/upload         │
│ FormData with audio blob │
│ Filename: voice.webm     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Save Voice File          │
│ /public/uploads/voice.webm
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Return URL               │
│ /uploads/voice.webm      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ POST /api/messages       │
│ type: "voice"            │
│ mediaUrl: /uploads/...   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│ Message with Audio       │
│ Appears with player      │
│ Users can play it        │
└──────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌──────────────────┐
│ Login Attempt    │
│ Email + Password │
└────────┬─────────┘
         ↓
┌──────────────────────┐
│ POST /api/auth/login │
└────────┬─────────────┘
         ↓
┌──────────────────────┐
│ Find User by Email   │
│ in MongoDB Users     │
└────────┬─────────────┘
         ↓
    ┌─────┴──────┐
    ↓            ↓
┌────────┐  ┌──────────┐
│ Found  │  │  Not     │
│        │  │ Found    │
└────┬───┘  └────┬─────┘
     ↓           ↓
┌─────────┐  ┌────────────────┐
│Compare  │  │ Return 401     │
│Password │  │ "Invalid email"│
└────┬────┘  └────────────────┘
     ↓
  ┌──┴──┐
  ↓     ↓
┌────┐ ┌──────────┐
│OK  │ │Mismatch  │
└─┬──┘ └─────┬────┘
  ↓          ↓
┌──────────────┐ ┌──────────┐
│Generate JWT  │ │Return 401│
│7 day exp     │ │"Invalid" │
└──────┬───────┘ └──────────┘
       ↓
┌──────────────┐
│Set HTTP-only │
│Cookie        │
└──────┬───────┘
       ↓
┌──────────────┐
│Return        │
│- Token       │
│- User Info   │
└──────┬───────┘
       ↓
┌──────────────┐
│Frontend      │
│Stores Token  │
│Redirect /chat│
└──────────────┘
```

---

## 📡 Real-Time Updates (Current HTTP Polling)

```
Frontend (Chat Component)
         ↓
┌────────────────────────┐
│ useEffect()            │
│ On mount & dependencies│
└────────┬───────────────┘
         ↓
    ┌─────────────────────┐
    │ Polling Loop        │
    │ (every 5 seconds)   │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │ GET /api/messages   │
    │ ?chatId=ID          │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │ Verify Token        │
    │ Query MongoDB       │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │ Return Messages     │
    │ (sorted by date)    │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │ Update State        │
    │ Re-render UI        │
    └────────┬────────────┘
             ↓
    ┌─────────────────────┐
    │ Wait 5 seconds      │
    │ Repeat...           │
    └─────────────────────┘
```

### Future: WebSocket Real-Time

```
Client                          Server
  ↓                               ↓
  └─ socket.connect() ──────────→ │
                                  ├ Create socket
                                  ├ Setup listeners
                                  │
  │ ← ─ connected ─────────────── ┤
  ├ Join room
  │
  ├─ emit('new-message') ───────→ │
  │                               ├ Broadcast to room
  │                               │
  │ ← ─ message-received ─────── ┤
  ├ Update UI instantly
```

---

## 🗄️ Database Schema & Relationships

```
┌─────────────────────┐
│      Users          │
├─────────────────────┤
│ _id (ObjectId)      │
│ username (String)*  │ ─┐
│ email (String)*     │  │
│ password (String)   │  │
│ avatar (String)     │  │
│ status (Enum)       │  │
│ lastSeen (Date)     │  │
│ createdAt (Date)    │  │
│ updatedAt (Date)    │  │
└─────────────────────┘  │
         ↑               │
         │               │
    *Indexed             │
    *Unique              │
                         │
                         │ Referenced in
                         │
        ┌────────────────┼─────────────────┐
        ↓                ↓                 ↓
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│     Chats       │  │  Messages    │  │  Messages    │
├─────────────────┤  ├──────────────┤  ├──────────────┤
│ _id             │  │ _id          │  │ senderId→   │
│ name            │  │ chatId→*     │  │ User._id    │
│ description     │  │ senderId→**  │  │              │
│ isGroupChat     │  │ senderName   │  │ **Indexed    │
│ participants[]→ │  │ content      │  │  with        │
│ admin→          │  │ messageType  │  │  createdAt   │
│ avatar          │  │ mediaUrl     │  └──────────────┘
│ lastMessage→    │  │ fileName     │
│ lastMessageTime │  │ fileSize     │
│ muted[]→        │  │ voiceDuration│
│ createdAt       │  │ reactions[]  │
│ updatedAt       │  │ readBy[]     │
└─────────────────┘  │ createdAt*   │
                     │ updatedAt    │
                     └──────────────┘
                     *Indexed pair
```

---

## 🔄 Component State Management

```
App Component
│
├── currentUser (Object)
│   └── { _id, username, email, avatar, status }
│
├── selectedChat (Object)
│   └── { _id, name, participants[], lastMessage }
│
├── chats (Array)
│   └── [{ _id, name, avatar, lastMessage, lastMessageTime }]
│
└── messages (Array)
    └── [{ _id, senderId, content, type, mediaUrl, createdAt }]
```

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
    ↓
npm run dev
    ↓
Next.js Dev Server (3000)
    ↓
Local MongoDB
```

### Production (Vercel)
```
GitHub Push
    ↓
Vercel CI/CD
    ↓
Build Process
    ↓
Deployment
    ↓
HTTPS Load Balancer
    ↓
├─ Next.js Server (Serverless Functions)
├─ Static Files (CDN)
│
└─ MongoDB Atlas (Cloud)
```

---

## 📊 Performance Optimization

### Database Queries
```
GET /api/messages
- Index: { chatId: 1, createdAt: -1 }
- Query Time: ~50ms
- Limit: 50 messages

GET /api/chats
- Index: { participants: 1, lastMessageTime: -1 }
- Query Time: ~30ms
- Limit: No limit (user owns)

POST /api/messages
- Write: ~100ms
- Index Update: ~10ms
- Total: ~110ms
```

### Caching Strategy
```
Frontend Caching
├─ localStorage
│  └─ authToken (7 days)
│  └─ user object
│
├─ sessionStorage (session-based)
│  └─ chat selection
│
└─ React State (in-memory)
   └─ messages
   └─ chats
   └─ currentUser
```

---

**This architecture ensures:**
✅ Scalability
✅ Security
✅ Performance
✅ User Experience
✅ Maintainability
