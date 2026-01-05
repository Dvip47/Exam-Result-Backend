# SarkariResult Backend API

Production-ready Node.js + Express REST API for the SarkariResult dynamic website.

## 🎯 Features

- ✅ JWT Authentication (Access + Refresh tokens)
- ✅ Role-based authorization
- ✅ MongoDB with Mongoose ODM
- ✅ Layered architecture (Routes → Controllers → Services → Models)
- ✅ Input validation & sanitization
- ✅ Rate limiting
- ✅ Security (Helmet, XSS protection, NoSQL injection prevention)
- ✅ Structured logging (Winston)
- ✅ Error handling middleware
- ✅ Soft deletes on all models
- ✅ API response standardization

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/            # Configuration files
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Custom middleware
│   ├── validators/        # Input validation rules
│   ├── utils/             # Utility functions
│   ├── seeders/           # Database seeders
│   └── server.js          # Express app entry
├── uploads/               # File uploads directory
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB)

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

4. **Update `.env` file**
   - Add your MongoDB connection string
   - Generate strong JWT secrets (32+ characters)
   - Update CORS origins for your frontend URLs

5. **Seed admin user**
   ```bash
   npm run seed:admin
   ```
   
   Default credentials:
   - Email: `admin@sarkariresult.com`
   - Password: `Admin@123456`
   
   ⚠️ **Change password immediately after first login!**

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will start on `http://localhost:5000`

### Health Check

```bash
curl http://localhost:5000/health
```

## 🔐 Authentication Flow

### 1. Register Admin (Protected - requires existing admin)
```bash
POST /api/auth/register
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123",
  "role": "admin"
}
```

### 2. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@sarkariresult.com",
  "password": "Admin@123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "Super Admin",
      "email": "admin@sarkariresult.com",
      "role": "admin"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### 3. Access Protected Routes
```bash
GET /api/auth/me
Authorization: Bearer {access_token}
```

### 4. Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### 5. Logout
```bash
POST /api/auth/logout
Authorization: Bearer {access_token}
```

## 📊 Database Models

### User
- Name, Email (unique), Password (hashed)
- Role: admin | editor
- Refresh token storage
- Soft delete support

### Category
- Name, Slug (unique)
- Display order
- Active/inactive status

### Post
- Title, Slug (unique), Descriptions
- Category reference
- Job details (organization, dates, qualification, etc.)
- Status: draft | published | archived
- SEO fields (meta title, description)
- Auto-expiry tracking
- View counter

### Page
- Title, Slug (unique)
- HTML content
- SEO fields

### Media
- File metadata
- Upload tracking

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register admin
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Coming Soon
- Categories CRUD
- Posts CRUD
- Pages CRUD
- Media upload
- Dashboard stats

## 🛡️ Security Features

### Password Requirements
- Minimum 8 characters
- Must contain:
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special character (@$!%*?&)

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Auth routes**: 5 attempts per 15 minutes
- **Upload routes**: 20 uploads per hour

### Protection Mechanisms
- Helmet (HTTP headers)
- CORS with whitelist
- XSS prevention
- NoSQL injection sanitization
- JWT with expiry
- bcrypt password hashing (10 rounds)

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_ACCESS_SECRET` | JWT access token secret | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - |
| `JWT_ACCESS_EXPIRE` | Access token expiry | 15m |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | 7d |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | * |
| `MAX_FILE_SIZE` | Max upload size in bytes | 10485760 |

## 🐛 Debugging

### View Logs
```bash
tail -f combined.log
tail -f error.log
```

### Common Issues

**MongoDB connection failed:**
- Verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for development)
- Check connection string format
- Ensure database user has correct permissions

**JWT errors:**
- Verify secrets are at least 32 characters
- Check token expiry times
- Ensure tokens are sent in Authorization header

## 📦 npm Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run seed:admin` | Seed admin user |

## 🏗️ Architecture

### Layered Design
```
Client Request
    ↓
Routes (API endpoints)
    ↓
Middleware (Auth, Validation, Rate Limit)
    ↓
Controllers (Request handling)
    ↓
Services (Business logic)
    ↓
Models (Database operations)
    ↓
MongoDB
```

### Best Practices Implemented
- Separation of concerns
- DRY principle
- Error handling at each layer
- Input validation before processing
- Centralized logging
- Standardized API responses

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets (32+ chars)
3. Configure MongoDB Atlas with restricted IP access
4. Set proper CORS origins
5. Enable SSL/TLS

### Recommended Platforms
- **Railway** (easiest)
- **Render**
- **AWS EC2**
- **DigitalOcean**

## 📄 License

MIT

## 👥 Support

For issues or questions, check the logs or contact the development team.

---

**Built with Node.js + Express + MongoDB**  
**Production-ready architecture with security best practices**
# Exam-Result-Backend
