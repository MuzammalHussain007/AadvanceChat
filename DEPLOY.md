# Build & Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git (optional, for version control)

### Installation Steps

1. **Clone/Download Project**
```bash
cd ai-chatbot
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Edit `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your-secret-key
NODE_ENV=development
```

4. **Start MongoDB**
```bash
mongod
```

5. **Seed Sample Data (Optional)**
```bash
npm run seed
```

6. **Start Development Server**
```bash
npm run dev
```

Access at http://localhost:3000

---

## Production Deployment

### Vercel (Recommended for Next.js)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**
- Go to vercel.com
- Click "New Project"
- Import your GitHub repository
- Configure environment variables

3. **Set Production Variables**
- `MONGODB_URI`: Your Atlas connection string
- `JWT_SECRET`: Strong random key (use 32+ chars)
- `NODE_ENV`: production

4. **Deploy**
- Vercel automatically deploys on git push

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t chat-app .
docker run -p 3000:3000 -e MONGODB_URI="..." chat-app
```

### Manual Server (AWS EC2, DigitalOcean, etc.)

1. **SSH into server**
```bash
ssh -i key.pem user@server-ip
```

2. **Install Node & MongoDB**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs mongodb
```

3. **Clone Repository**
```bash
git clone your-repo-url
cd ai-chatbot
```

4. **Install & Build**
```bash
npm ci
npm run build
```

5. **Set Environment Variables**
```bash
export MONGODB_URI="..."
export JWT_SECRET="..."
export NODE_ENV="production"
```

6. **Start Application**
```bash
npm start
```

Or use PM2 for persistence:
```bash
npm install -g pm2
pm2 start "npm start" --name "chat-app"
pm2 save
pm2 startup
```

---

## Build Optimization

### Production Build
```bash
npm run build
npm start
```

### Build Analysis
```bash
npm run build
# Check .next/static for bundle sizes
```

### Environment Variables in Production

**Required for Production:**
- `MONGODB_URI`: Remote database
- `JWT_SECRET`: Strong, unique key
- `NODE_ENV`: "production"

**Optional:**
- `OPENAI_API_KEY`: For future features

---

## Performance Tips

### Database
- Use MongoDB Atlas with proper region
- Enable connection pooling
- Add indexes (auto-created)

### Caching
- Next.js handles static optimization
- CDN for uploaded files (S3, Cloudinary)

### Monitoring
- Set up error logging (Sentry)
- Monitor database performance
- Track API response times

---

## Scaling Considerations

### Current Limitations
- Single MongoDB instance
- File uploads to local filesystem
- No caching layer

### Scaling Steps
1. **Database**: MongoDB Atlas scaling
2. **Storage**: AWS S3 or similar for uploads
3. **Cache**: Redis for frequently accessed data
4. **WebSocket**: Socket.io server for real-time
5. **Load Balance**: Multiple app instances

### Horizontal Scaling
```
     Load Balancer
          ↓
    ┌─────┴─────┐
    ↓           ↓
  App1        App2
    └─────┬─────┘
          ↓
      MongoDB Atlas
          ↓
        S3/CDN
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test # if tests exist
      - name: Deploy
        run: npm run deploy
```

---

## Monitoring & Maintenance

### Health Checks
```bash
# Check if server is running
curl http://localhost:3000

# Check API endpoint
curl http://localhost:3000/api/chats
```

### Logs
```bash
# View application logs
pm2 logs chat-app

# View error logs
tail -f logs/error.log
```

### Database Maintenance
```bash
# Backup MongoDB
mongodump --uri="mongodb://..." --out=backup/

# Restore MongoDB
mongorestore --uri="mongodb://..." backup/

# Clean up old uploads
find public/uploads -mtime +30 -delete
```

---

## SSL/HTTPS

### Let's Encrypt (Free SSL)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d yourdomain.com
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Troubleshooting Deployment

### Port Issues
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

### Database Connection
- Verify connection string
- Check IP whitelist (MongoDB Atlas)
- Test connection: `mongosh "mongodb://..."`

### File Upload Issues
- Ensure write permissions: `chmod 755 public/uploads`
- Check disk space: `df -h`
- Verify file size limits in Next.js config

---

## Rollback Procedure

```bash
# If deployment fails
git revert HEAD
git push origin main

# Or use PM2
pm2 restart chat-app
pm2 revert
```

---

## Security Checklist for Production

- [ ] JWT_SECRET is strong and unique
- [ ] HTTPS/SSL enabled
- [ ] MongoDB password protected
- [ ] Database backups automated
- [ ] Error logging without sensitive data
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Input validation on all endpoints
- [ ] Upload file type validation
- [ ] Maximum file size limits
- [ ] Old files cleaned up regularly
- [ ] Regular security updates
- [ ] Environment variables secured

---

## Support

For deployment issues, check:
1. Application logs
2. Database connectivity
3. Environment variables
4. File permissions
5. Network/firewall settings
