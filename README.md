# FounderCFO - Founder's AI CFO Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis (optional, for caching)

### Development Setup

```bash
# 1. Clone and install
cd apps/backend && npm install
cd ../frontend && npm install

# 2. Configure environment
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Edit both files with your credentials

# 3. Start database (using Docker)
./deploy.sh dev

# 4. Run migrations
cd apps/backend && npx prisma migrate deploy

# 5. Start development servers
cd apps/backend && npm run start:dev
cd apps/frontend && npm run dev -- -p 3005
```

### Access
- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

---

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | 64+ character secret key | ✅ |
| `GEMINI_API_KEY` | Google Generative AI key | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | For OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | For OAuth |
| `ALLOWED_ORIGINS` | CORS allowed origins | Production |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ |

---

## 🐳 Docker Deployment

### Development
```bash
./deploy.sh dev      # Start DB + Redis only
```

### Production
```bash
./deploy.sh build    # Build all images
./deploy.sh prod     # Start all services
./deploy.sh stop     # Stop all services
./deploy.sh clean    # Remove containers + volumes
```

---

## 📁 Project Structure

```
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── auth/     # Authentication
│   │   │   ├── ai/       # Gemini AI integration
│   │   │   ├── statements/ # Document parsing
│   │   │   ├── compliance/ # GST/Tax compliance
│   │   │   └── ...
│   │   └── prisma/       # Database schema
│   │
│   └── frontend/         # Next.js App
│       └── src/
│           ├── app/      # Pages
│           ├── components/
│           └── services/
│
├── nginx.conf            # Production proxy config
├── docker-compose.yml    # Container orchestration
└── deploy.sh             # Deployment script
```

---

## 🔒 Security Features

- ✅ Helmet security headers
- ✅ Rate limiting (100 req/min, stricter on auth)
- ✅ CORS restriction
- ✅ JWT authentication with expiry
- ✅ Password hashing (bcrypt)
- ✅ SQL injection protection (Prisma)
- ✅ Input validation (class-validator)
- ✅ XSS protection

---

## 🧪 Testing

```bash
cd apps/backend
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run test:cov     # Coverage report
```

---

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - Email/password login
- `POST /auth/register` - Create account
- `GET /auth/google` - Google OAuth
- `GET /auth/me` - Current user

### Financial Metrics
- `POST /statements/upload` - Upload financial documents
- `GET /financial-metrics/:orgId/dashboard` - Dashboard data

### AI
- `POST /ai/chat` - AI conversation
- `POST /ai/analyze` - Document analysis

### Health
- `GET /health` - Service status
- `GET /health/ready` - Readiness probe

---

## 📝 License

Proprietary - All rights reserved

---

## 🤝 Support

For issues, contact: support@foundercfo.in
