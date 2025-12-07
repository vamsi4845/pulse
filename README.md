# Video Upload, Processing, and Streaming Application

A comprehensive full-stack application that enables users to upload videos, processes them for content sensitivity analysis, and provides seamless video streaming capabilities with real-time progress tracking.

## Features

- **Video Upload**: Drag-and-drop or click-to-upload interface with progress tracking
- **Real-Time Processing**: Live updates on video processing status via Socket.io
- **Content Sensitivity Analysis**: Automated content screening and classification (safe/flagged)
- **Video Streaming**: HTTP range request support for efficient video playback
- **Multi-Tenant Architecture**: User isolation with organization-based data segregation
- **Role-Based Access Control**: Viewer, Editor, and Admin roles with appropriate permissions
- **Video Library**: Comprehensive list with filtering, search, and pagination

## Technology Stack

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time**: Socket.io
- **Authentication**: JWT
- **File Storage**: AWS S3
- **File Upload**: Multer

### Frontend
- **Build Tool**: Vite
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Real-Time**: Socket.io Client

## Project Structure

```
pulse/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files (DB, S3, Socket)
│   │   ├── models/          # Mongoose models (User, Video, Organization)
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Auth, RBAC, upload middleware
│   │   ├── services/        # Business logic (S3, video processing, streaming)
│   │   ├── controllers/     # Route controllers
│   │   ├── utils/           # Utilities (logger, error handlers)
│   │   └── server.js        # Entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts (Auth, Socket)
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API and Socket services
│   │   ├── utils/           # Constants and utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- AWS Account with S3 bucket configured
- AWS Access Key ID and Secret Access Key

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/video-app
JWT_SECRET=your-secret-key-change-in-production
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Optional: AWS Rekognition settings (defaults work fine)
REKOGNITION_MIN_CONFIDENCE=50
REKOGNITION_POLL_INTERVAL=5000
REKOGNITION_MAX_POLL_ATTEMPTS=120
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults are configured):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## AWS S3 Configuration

1. Create an S3 bucket in your AWS account
2. Configure CORS settings for the bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }
]
```
3. Set bucket permissions to allow your AWS credentials to read/write
4. Update `.env` with your bucket name and AWS credentials

## Usage

### User Registration

1. Navigate to `/register`
2. Fill in:
   - Email address
   - Organization name
   - Role (Viewer, Editor, or Admin)
   - Password (minimum 6 characters)
3. Click "Create account"

### User Login

1. Navigate to `/login`
2. Enter your email and password
3. Click "Sign in"

### Uploading Videos

1. Log in as an Editor or Admin
2. On the dashboard, use the upload area:
   - Drag and drop a video file, or
   - Click to browse and select a file
3. Monitor upload and processing progress in real-time
4. Once processing completes, the video will appear in the library

### Viewing Videos

1. Navigate to the Video Library section
2. Use filters to find specific videos:
   - Filter by status (uploading, processing, completed, failed)
   - Filter by sensitivity (safe, flagged)
   - Search by filename
3. Click "View" on a completed video to watch it

### Roles and Permissions

- **Viewer**: Can view completed videos only
- **Editor**: Can upload videos and view all videos in their organization
- **Admin**: Full access including user management (future enhancement)

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "editor",
  "organizationName": "My Organization"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "editor",
      "organizationId": "org_id"
    },
    "token": "jwt_token"
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register

#### GET `/api/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <token>`

### Video Endpoints

#### POST `/api/videos/upload`
Upload a video file.

**Headers:** `Authorization: Bearer <token>`

**Request:** Multipart form data with `video` field

**Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "_id": "video_id",
      "filename": "video.mp4",
      "status": "processing",
      ...
    }
  }
}
```

#### GET `/api/videos`
Get list of videos with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (uploading, processing, completed, failed)
- `sensitivityStatus`: Filter by sensitivity (safe, flagged)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

#### GET `/api/videos/:id`
Get video details including streaming URL.

**Response:**
```json
{
  "success": true,
  "data": {
    "video": {
      "_id": "video_id",
      "originalName": "video.mp4",
      "status": "completed",
      "sensitivityStatus": "safe",
      "streamUrl": "presigned_url",
      ...
    }
  }
}
```

#### GET `/api/videos/:id/stream`
Stream video with HTTP range request support.

**Headers:** `Range: bytes=start-end` (optional)

**Response:** Video stream with 206 Partial Content status

#### DELETE `/api/videos/:id`
Delete a video (Editor/Admin only).

## Socket.io Events

### Client → Server
- Connection with auth token, userId, and organizationId

### Server → Client
- `video:processing`: Emitted during video processing
  ```json
  {
    "videoId": "video_id",
    "progress": 50,
    "status": "processing"
  }
  ```
- `video:completed`: Emitted when processing completes
  ```json
  {
    "videoId": "video_id",
    "status": "completed",
    "sensitivityStatus": "safe"
  }
  ```
- `video:failed`: Emitted when processing fails

## Video Processing & Content Moderation

The application includes AI-powered content moderation using AWS Rekognition:
- Analyzes videos directly from S3 (no download or frame extraction needed)
- Uses AWS Rekognition Video Content Moderation API
- Classifies videos as "safe" or "flagged" based on content analysis
- Provides real-time progress updates (0-100%)
- Updates video status in the database

### Content Moderation Setup

**AWS Rekognition is already configured** using your existing AWS credentials!

**Free Tier:**
- First 5,000 minutes of video analyzed per month — **FREE**
- After that: ~$0.10 per minute

**Optional Environment Variables** (in `.env`):
```env
# AWS credentials (already configured for S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Rekognition settings (optional, defaults shown)
REKOGNITION_MIN_CONFIDENCE=50        # Minimum confidence % (0-100)
REKOGNITION_POLL_INTERVAL=5000        # Poll interval in ms
REKOGNITION_MAX_POLL_ATTEMPTS=120     # Max polling attempts (~10 minutes)

# Optional: SNS notifications for async processing
REKOGNITION_SNS_TOPIC_ARN=arn:aws:sns:...
REKOGNITION_ROLE_ARN=arn:aws:iam::...
```

**How it works:**
- Videos are analyzed directly from S3 (no download needed)
- Rekognition processes the entire video for comprehensive analysis
- Results are returned with confidence scores
- Videos are flagged if explicit content is detected above the confidence threshold
- Falls back to "safe" if moderation fails (graceful degradation)

## Multi-Tenant Architecture

- Each user belongs to an organization
- All data queries are filtered by organizationId
- Users can only access videos from their organization
- Socket.io rooms are organized by organization and user

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Secure file upload validation
- Presigned URLs for S3 access

## Error Handling

- Comprehensive error handling middleware
- User-friendly error messages
- Proper HTTP status codes
- Error logging for debugging

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Building for Production

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview  # Preview production build
```

## Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Ensure MongoDB is accessible
3. Configure AWS credentials
4. Deploy to platforms like:
   - Heroku
   - Railway
   - Render
   - AWS EC2/ECS

### Frontend Deployment

1. Build the production bundle:
```bash
cd frontend
npm run build
```

2. Deploy the `dist` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting service

3. Update `VITE_API_URL` and `VITE_SOCKET_URL` environment variables

## Testing

Basic testing can be performed by:
1. Testing API endpoints with Postman or similar tools
2. Testing video upload flow end-to-end
3. Verifying streaming functionality with different video formats
4. Testing real-time updates via Socket.io

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Verify MongoDB is running
   - Check MONGODB_URI in `.env`

2. **S3 Upload Fails**
   - Verify AWS credentials
   - Check bucket permissions
   - Verify bucket name and region

3. **Socket.io Connection Issues**
   - Check CORS settings
   - Verify Socket.io server is running
   - Check authentication token

4. **Video Streaming Not Working**
   - Verify video status is "completed"
   - Check S3 bucket CORS configuration
   - Verify presigned URL generation

## Future Enhancements

- ✅ AI-powered content moderation (implemented with AWS Rekognition)
- Video thumbnail generation
- Multiple video quality options
- User management interface for admins
- Email notifications
- Video comments and ratings
- Advanced analytics dashboard
- Admin review queue for flagged videos
- Appeal system for flagged content

## License

This project is created for educational purposes.

## Author

Developed as part of a full-stack application assignment.

