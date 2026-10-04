# JobHexa - All India Government Job Portal

Find government jobs you are eligible for. Built with React + Vite, Tailwind, Node+Express, MongoDB, Mongoose, JWT, Ollama.

## Features
- Auth (register/login, JWT, bcrypt)
- Profile (qualification, age, category, state)
- Jobs (8 mock, filters, search, pagination, deadlines)
- Eligibility engine (qualification + age + category relaxation + domicile, explainable)
- Saved jobs, Application tracker
- Preparation (14 subjects, 65 topics, YouTube)
- Admin panel (verify jobs, manage users, audit logs, PDF upload)
- AI Assistant (Groq gpt-oss-120b, RAG with Job DB, two-panel workspace, study plan 1-90 days, recommendations, interview prep)
- Study Plan daily notifications (8 AM IST, in-app + Gmail)
- Notifications bell

## Quick Start

### Prerequisites
- Node.js 18+, MongoDB Atlas, Groq API key (free at console.groq.com, no local GPU needed)

### Install
```bash
npm run install:all
# or
npm install --prefix client && npm install --prefix server
```

### Env
`server/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jobhexa
JWT_SECRET=jobhexa_super_secret_2026_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
SMTP_FROM=noreply@jobhexa.com
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_from_console_groq_com
GROQ_MODEL=openai/gpt-oss-120b
```

### Seed
```bash
cd server && npm run seed
# Admin: admin@jobhexa.com / admin123
```

### Run
```bash
npm run dev          # both
npm run client       # frontend :5173
npm run server       # backend :5000
```

### Test
- Frontend: http://localhost:5173
- Backend: http://localhost:5000/api/health
- Chat: http://localhost:5173/chat
- My Plan: http://localhost:5173/my-plan
- Admin: http://localhost:5173/admin

## API
- Auth: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- Jobs: GET /api/jobs, GET /api/jobs/:slug, GET /api/jobs/:slug/eligibility, GET /api/jobs/recommended
- Users: GET/PUT /api/users/profile
- Saved: GET/POST/DELETE /api/saved-jobs
- Applications: GET/POST/PUT/DELETE /api/applications
- Prep: GET /api/prep/exams, /subjects, /topics/:slug, /missing-topics, /syllabus-match/:exam
- Chat: POST /api/chat, POST /api/chat/study-plan, POST /api/chat/interview, POST /api/pdf/extract (admin)
- Admin: GET /api/admin/dashboard, /jobs, /jobs/pending, PATCH /jobs/:id/verify, GET /api/admin/users
- Notifications: GET /api/notifications, GET /api/notifications/unread-count, PATCH /read-all

## Groq (cloud AI, free tier, no card)
```bash
# No install — get a key at https://console.groq.com/keys and set GROQ_API_KEY in server/.env
# Check: key starts with gsk_ and /api/chat answers
```

## n8n (optional)
- Workflows in `n8n-workflows/` - import to http://localhost:5678

## Build
```bash
cd client && npm run build
cd server && node server.js
```
