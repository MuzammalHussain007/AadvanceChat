# Quick Start Guide - Multi-User Chat App

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB from https://www.mongodb.com/try/download/community
# Start MongoDB service
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Copy connection string
5. Update `MONGODB_URI` in `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
   ```

### 3. Seed Sample Data (Optional)
```bash
npm run seed
```

This creates:
- 3 sample users (alice, bob, charlie)
- 2 sample chats
- Test messages

Login credentials:
```
Username: alice
Email: alice@example.com
Password: password123

OR

Username: bob
Email: bob@example.com
Password: password123
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Features Demo

### 1. **Authentication**
- Register new account at `/register`
- Login at `/login`
- Automatic redirect to chat on success

### 2. **Chat Interface**
- **Left Sidebar**: List of all your conversations
- **Main Window**: Selected chat conversation
- **Search**: Find chats by name
- **New Chat**: Start conversation with users

### 3. **Message Types**

#### Text Messages
```
Simply type and press Enter or click Send
```

#### Emoji 😊
```
1. Click the emoji button (😊)
2. Select emoji from picker
3. Send message
```

#### File/Image Upload 📎
```
1. Click attachment button
2. Select file or image
3. Auto-uploads and sends
```

#### Voice Messages 🎤
```
1. Click microphone button to START recording
2. Speak your message
3. Click microphone again to STOP and send
4. Voice message uploads automatically
```

---

## 🔐 Security Notes

**Development Only Settings:**
- JWT_SECRET is set to a default value
- Change in `.env.local` before production

**Production Checklist:**
- [ ] Change JWT_SECRET
- [ ] Use strong database password
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Use environment variables (not .env.local)
- [ ] Enable CORS properly
- [ ] Set secure cookies

---

## 📝 API Endpoints Reference

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Chats
```
GET /api/chats
POST /api/chats (create new chat)
```

### Messages
```
GET /api/messages?chatId=CHAT_ID
POST /api/messages (send message)
```

### Uploads
```
POST /api/upload (files, images, voice)
```

---

## 🛠️ Troubleshooting

### Issue: Cannot connect to MongoDB
**Solution:**
- Check MongoDB is running: `mongod`
- Verify connection string in `.env.local`
- Check firewall settings

### Issue: Port 3000 already in use
**Solution:**
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows - use different port
npm run dev -- -p 3001
```

### Issue: Files not uploading
**Solution:**
- Check `/public/uploads/` directory exists
- Ensure write permissions on folder
- File size shouldn't exceed 50MB

### Issue: Seed data not loading
**Solution:**
```bash
# Make sure MongoDB is running first
mongod

# Then run seed
npm run seed
```

---

## 📚 Next Steps

1. **Create Multiple Test Accounts**
   - Register 2-3 accounts
   - Start conversations between them
   - Test real-time messaging

2. **Test All Features**
   - Send text messages
   - Add emojis
   - Upload images/files
   - Record voice messages

3. **Explore Codebase**
   - Check `/models` for database schemas
   - Review `/components` for UI logic
   - Inspect `/app/api` for API routes

4. **Customize**
   - Change colors in Tailwind CSS
   - Add your logo/branding
   - Modify message formats
   - Add more emoji categories

---

## 🎯 Common Tasks

### Change App Title
Edit `app/layout.js`:
```javascript
export const metadata = {
  title: "Your App Name",
  description: "Your app description",
};
```

### Change Colors/Theme
Edit Tailwind classes in components:
```javascript
// Change from blue-500 to green-500
className="bg-blue-500"  // ❌
className="bg-green-500" // ✅
```

### Add More Users to Group Chat
Update chat creation in `app/api/chats/route.js`:
```javascript
const participantIds = [userId1, userId2, userId3]; // Add more IDs
```

---

## 📞 Need Help?

1. Check `SETUP.md` for detailed instructions
2. Review project structure in README
3. Check console for error messages
4. Verify `.env.local` settings

---

**Enjoy your chat app! 💬✨**
