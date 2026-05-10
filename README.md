# Team Task Manager

## Live Demo

Railway URL: `https://your-railway-app.up.railway.app`

| User | Email | Password | Role |
| --- | --- | --- | --- |
| Admin User | `admin@demo.com` | `Password1` | ADMIN |
| Alice Chen | `alice@demo.com` | `Password1` | MEMBER |
| Bob Smith | `bob@demo.com` | `Password1` | MEMBER |

## Features

- 🔐 JWT auth in an httpOnly cookie with bcrypt password hashing
- 📊 Dashboard stats for projects, tasks, completion, overdue work, and active members
- 🗂️ Project cards with progress, member avatars, status, color, and task counts
- 🧲 HTML5 drag-and-drop Kanban board with optimistic updates
- 📋 Sortable task table with status and priority filters
- 👥 Project membership, ADMIN role controls, and member-safe permissions
- 🧭 Hash router with browser back/forward support
- 🧱 Railway-ready Dockerfile, health check, and MongoDB env configuration

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| Server | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Auth | JWT, bcryptjs, httpOnly cookies |
| Frontend | Vanilla JS, HTML, CSS |
| Deployment | Railway, Docker |

## Local Setup

```bash
git clone <repo> && cd team-task-manager
npm install
cp .env.example .env        # fill MONGODB_URI + JWT_SECRET
npm run seed                # optional demo data
npm run dev                 # http://localhost:3000
```

## Railway Deployment

1. Create a new Railway project.
2. Add the MongoDB plugin so Railway injects `MONGODB_URI`, or set `MONGODB_URI` manually from MongoDB Atlas.
3. Add a strong `JWT_SECRET` environment variable.
4. Connect the GitHub repository.
5. Railway deploys automatically with the included `Dockerfile`.
6. Open `/api/health` to confirm the app and database status.

## API Reference

| Area | Method | Endpoint | Auth | Role |
| --- | --- | --- | --- | --- |
| Auth | POST | `/api/auth/signup` | No | Public |
| Auth | POST | `/api/auth/login` | No | Public |
| Auth | POST | `/api/auth/logout` | Yes | User |
| Auth | GET | `/api/auth/me` | Yes | User |
| Projects | GET | `/api/projects` | Yes | Member |
| Projects | POST | `/api/projects` | Yes | User |
| Projects | GET | `/api/projects/:id` | Yes | Member |
| Projects | PATCH | `/api/projects/:id` | Yes | ADMIN |
| Projects | DELETE | `/api/projects/:id` | Yes | ADMIN |
| Tasks | GET | `/api/projects/:projectId/tasks` | Yes | Member |
| Tasks | POST | `/api/projects/:projectId/tasks` | Yes | Member |
| Tasks | GET | `/api/projects/:projectId/tasks/:taskId` | Yes | Member |
| Tasks | PATCH | `/api/projects/:projectId/tasks/:taskId` | Yes | ADMIN, creator, or assignee status-only |
| Tasks | DELETE | `/api/projects/:projectId/tasks/:taskId` | Yes | ADMIN |
| Members | GET | `/api/projects/:projectId/members` | Yes | Member |
| Members | POST | `/api/projects/:projectId/members` | Yes | ADMIN |
| Members | PATCH | `/api/projects/:projectId/members/:userId` | Yes | ADMIN |
| Members | DELETE | `/api/projects/:projectId/members/:userId` | Yes | ADMIN |
| Dashboard | GET | `/api/dashboard/stats` | Yes | User |
| Health | GET | `/api/health` | No | Public |

## Project Structure

```text
/
├── src/
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── roles.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── members.js
│   │   └── dashboard.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   ├── memberController.js
│   │   └── dashboardController.js
│   ├── utils/
│   │   ├── db.js
│   │   └── seed.js
│   └── app.js
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   └── layout.css
│   └── js/
│       ├── api.js
│       ├── router.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── projects.js
│       ├── tasks.js
│       └── members.js
├── server.js
├── package.json
├── .env.example
├── Dockerfile
├── railway.json
└── README.md
```

## Screenshots

Add screenshots here after deploying the Railway app.
