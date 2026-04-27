# Configuration Guide

## Environment Variables

### Database Configuration

**MONGODB_URI**
- **Description**: MongoDB connection string
- **Required**: Yes
- **Examples**:
  - Local: `mongodb://localhost:27017/chatapp`
  - Atlas: `mongodb+srv://user:password@cluster.mongodb.net/chatapp`
- **Default**: `mongodb://localhost:27017/chatapp`

### Security Configuration

**JWT_SECRET**
- **Description**: Secret key for signing JWT tokens
- **Required**: Yes (but has default in development)
- **Requirements**: 
  - Minimum 32 characters in production
  - Use strong random string
  - Keep secret, never commit to git
- **Default (Dev Only)**: `your-secret-key-change-in-production`
- **Generate New**: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### Optional Configuration

**OPENAI_API_KEY**
- **Description**: OpenAI API key for AI features
- **Required**: No
- **Format**: `sk-...` (from OpenAI dashboard)
- **Purpose**: For future AI integration

**NODE_ENV**
- **Description**: Environment mode
- **Options**: `development` | `production` | `test`
- **Default**: `development`
- **Note**: Set to `production` when deploying

---

## Default Sample Data

When seeding database, the following users are created:

| Username | Email | Password | Status |
|----------|-------|----------|--------|
| alice | alice@example.com | password123 | online |
| bob | bob@example.com | password123 | online |
| charlie | charlie@example.com | password123 | offline |

**Sample Chats:**
1. Direct chat between Alice & Bob
2. Group chat with all three users

---

## Upload Configuration

### Supported File Types

**Images**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Max size: 50MB
- Used for sharing photos/screenshots

**Documents**
- `.pdf`, `.doc`, `.docx`, `.txt`
- Max size: 50MB
- Used for sharing files

**Voice Messages**
- `.webm` (WebM audio)
- Recorded via browser MediaRecorder API
- Variable size depending on duration

### Upload Directory
- **Path**: `/public/uploads/`
- **Auto-created**: Yes (if write permissions exist)
- **Cleanup**: Manual (files don't auto-delete)

---

## Database Schema Overview

### Users Collection
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  avatar: String (URL),
  status: String (online|offline|away),
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Chats Collection
```javascript
{
  name: String,
  description: String,
  isGroupChat: Boolean,
  participants: [ObjectId], // User IDs
  admin: ObjectId, // User ID
  avatar: String (URL),
  lastMessage: ObjectId,
  lastMessageTime: Date,
  muted: [ObjectId], // User IDs of muted users
  createdAt: Date,
  updatedAt: Date
}
```

### Messages Collection
```javascript
{
  chatId: ObjectId,
  senderId: ObjectId, // User ID
  senderName: String,
  senderAvatar: String (URL),
  content: String,
  messageType: String (text|image|file|voice|emoji),
  mediaUrl: String (URL to uploaded file),
  fileName: String,
  fileSize: Number (bytes),
  voiceDuration: Number,
  readBy: [{ userId: ObjectId, readAt: Date }],
  reactions: [{ userId: ObjectId, emoji: String }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication Flow

### Registration
```
1. User submits: username, email, password
2. Check if user exists → Error if exists
3. Hash password with bcryptjs
4. Create user in database
5. Generate JWT token
6. Set auth cookie
7. Redirect to chat
```

### Login
```
1. User submits: email, password
2. Find user by email
3. Compare password with hash
4. If match → Generate JWT token
5. Set auth cookie
6. Redirect to chat
```

### Token Validation
```
1. Extract token from Authorization header
2. Verify signature with JWT_SECRET
3. Check expiration (7 days)
4. Extract userId from token
```

---

## API Authentication

### Header Format
```
Authorization: Bearer <JWT_TOKEN>
```

### Example Request
```bash
curl -X GET http://localhost:3000/api/chats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

### Token Storage (Frontend)
- **Primary**: `localStorage` (authToken)
- **Cookies**: HTTP-only (authToken)
- **Duration**: 7 days

---

## Error Handling

### Common Error Codes

| Code | Error | Cause |
|------|-------|-------|
| 400 | Bad Request | Missing required fields |
| 401 | Unauthorized | Invalid/missing token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal error |

### Example Error Response
```json
{
  "error": "Invalid email or password"
}
```

---

## Performance Optimization

### Message Fetching
- **Limit**: 50 messages per request
- **Sort**: By creation date (newest last)
- **Future**: Implement pagination

### Chat Fetching
- **Sort**: By last message time (newest first)
- **Refresh**: Every 5 seconds (configurable)

### Database Indexes
```javascript
// Automatic indexes created:
- Messages: { chatId, createdAt }
- Chats: { participants, lastMessageTime }
- Users: { email, username } (unique)
```

---

## Development vs Production

### Development Settings
```env
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/chatapp
```

### Production Checklist
- [ ] Use strong JWT_SECRET
- [ ] Use MongoDB Atlas or managed database
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS
- [ ] Set secure cookie flags
- [ ] Add rate limiting
- [ ] Enable logging
- [ ] Set up monitoring

---

## Useful Commands

```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Connect to MongoDB shell
mongosh

# Seed database
npm run seed

# Build for production
npm run build

# Start production server
npm start

# Check for lint errors
npm run lint

# Run development server
npm run dev
```

---

## Security Best Practices

✅ **Do's**
- Use strong, random JWT_SECRET
- Hash passwords with bcryptjs
- Validate all inputs server-side
- Use HTTPS in production
- Store secrets in .env (not .env.local)
- Regularly update dependencies
- Monitor error logs

❌ **Don'ts**
- Commit .env.local to git
- Use weak passwords
- Skip input validation
- Trust client-side validation only
- Log sensitive data
- Use default secrets in production
- Leave debug mode on

---

## Support & Troubleshooting

See `QUICKSTART.md` for common issues and solutions.
