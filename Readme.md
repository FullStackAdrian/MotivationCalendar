# 🗓️ Motivation Calendar

> A minimalist, interactive 365-day canvas to map and color-code your entire year.

## Overview

Motivation Calendar is a simple designed web application that helps you visualize your year at a glance. Track your daily progress, habits, and goals using an intuitive color-coding system. Watch your year fill with motivation as you mark off each day.

Perfect for:
- 📊 Habit tracking
- 🎯 Goal monitoring
- 📈 Progress visualization
- 💪 Building streaks
- 🎨 Personal motivation mapping

## Features

### Core Features
- **📅 365-Day Canvas**: Interactive calendar view of the entire year
- **🎨 Color-Coded System**: 4 colors to represent different level of task completion
- **✨ Minimalist Design**: Clean, distraction-free interface focused on your progress

### Authentication & Sync
- **🔐 JWT Authentication**: Secure user authentication with bcrypt password hashing
- **💾 Local Storage Sync**: Your data automatically saves to your device
- **🔄 Auto-Save**: Never lose your progress with real-time data persistence
- **☁️ Cross-device Sync**: Sync your progress across multiple devices

### User Experience
- **🎯 Quick Entry**: One-click color assignment for any day
- **📊 Statistics**: Track your consistency and streaks at a glance
- **🌐 Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd motivation-calendar
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your values:
```env
PORT=3000
JWT_SECRET=tu-secreto-super-seguro-cambia-en-produccion
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

4. Start the server:
```bash
npm start
```

5. Open your browser at `http://localhost:3000`

### Basic Usage
1. **Register** a new account or **Login** with existing credentials
2. **Click on any day** to assign a status (completed, partial, failed)
3. **View statistics** to see your progress and consistency
4. Your data is **automatically synced** between local storage and the server

## Project Structure

```
motivation-calendar/
├── backend/
│   ├── config/          # Server configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware (auth, etc.)
│   ├── models/          # Data models and database
│   ├── presenters/      # Response formatters
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── usecases/        # Use case orchestration
│   └── server.js        # Entry point
├── frontend/
│   ├── assets/
│   │   ├── css/         # Stylesheets
│   │   ├── images/      # Static images
│   │   └── js/
│   │       ├── views/   # UI components
│   │       └── app.js   # Main application logic
│   └── index.html       # Main HTML file
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Progress
- `GET /api/progress` - Get user's progress
- `PUT /api/progress/:dayKey` - Update a specific day (YYYY-MM-DD)
- `POST /api/progress/bulk` - Update multiple days at once

### Health Check
- `GET /api/health` - Server health status

## To Do

- [ ] Dark mode
- [ ] MongoDB/PostgreSQL integration for persistent storage
- [ ] Unit and integration tests
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Export data feature
- [ ] Mobile app (React Native/Flutter)

## Security Notes

⚠️ **Important for Production:**
- Change `JWT_SECRET` to a strong random value
- Set `ALLOWED_ORIGINS` to your specific domains
- Use HTTPS in production
- Consider rate limiting for API endpoints

## License

ISC
