# CollaboDraw

CollaboDraw is a real-time collaborative whiteboard and brainstorming platform built for teams to create, share, and refine ideas together. Users can create projects, collaborate on interactive slides, invite teammates, chat in real time, and work from a polished dashboard experience.

## Overview

CollaboDraw combines a modern React frontend with a Node.js/Express backend and Socket.IO for live collaboration. The platform is designed for fast ideation sessions, product planning, design reviews, and shared visual thinking.

### Core features

- User authentication and protected workspaces
- Real-time collaborative drawing and whiteboard sessions
- Project and slide-based organization
- Team member invitations and role-aware collaboration
- Live presence indicators and team chat
- Responsive dashboard for browsing and managing projects
- Secure JWT-based authentication with cookie support

## Tech stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Socket.IO client
- Konva / React Konva / tldraw

### Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB with Mongoose
- JWT + bcryptjs
- Cookie-based auth

## Project structure

```text
backend/
  src/
    app.js
    server.js
    controllers/
    middleware/
    models/
    routes/
    sockets/
    utils/

frontend/
  src/
    components/
    context/
    hooks/
    pages/
    utils/
```

## Prerequisites

Before running the project locally, make sure you have:

- Node.js 18+ and npm
- MongoDB running locally or a MongoDB Atlas connection string
- Git

## Environment variables

Create a `.env` file inside the backend directory with the following variables:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/collabodraw
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:5173
```

If you are using MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

## Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd PCON-Hackathon
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   npm install
   ```

## Running locally

Start the backend server:

```bash
cd backend
npm run dev
```

Start the frontend development server in a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend will typically run at `http://localhost:5173` and the backend at `http://localhost:5000`.

## Available scripts

### Backend
- `npm run dev` - start backend in development mode with nodemon
- `npm start` - start the production server

### Frontend
- `npm run dev` - start Vite development server
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally

## API overview

The backend exposes REST APIs for:

- Authentication: `/api/auth`
- Rooms and collaboration: `/api/room`
- Projects: `/api/projects`

Socket.IO events power real-time features such as presence updates, chat, and collaborative slide synchronization.

## Deployment notes

The project is structured for modern deployment workflows:

- Frontend: deploy on Vercel or any static hosting service supporting Vite
- Backend: deploy on Railway, Render, or similar Node.js hosting platforms
- MongoDB: use MongoDB Atlas for production data storage

Make sure to configure your production environment variables securely and update CORS origins to match your deployed frontend domain.

## Contributing

Contributions are welcome. Please follow these steps:

1. Create a feature branch
2. Make your changes
3. Test locally
4. Open a pull request with a clear description

## License

This project is currently unlicensed. Add a license file if you plan to distribute or share it publicly.
