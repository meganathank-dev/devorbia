# DevOrbia

DevOrbia is an AI-powered software-development management SaaS platform.

## Current Development Phase: Phase 0

In Phase 0, we have established a clean, secure, maintainable, production-oriented technical foundation. **No business functionality (authentication, users, organizations, etc.) has been implemented yet.**

## Technology Stack

- **Frontend:** React, Vite, Tailwind CSS v4, React Router, Zustand, Axios, Lucide React
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, Zod
- **Architecture:** Modular Monolith

## Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or via Atlas)

## Environment Variables

Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Update the `MONGODB_URI` and other variables as necessary.

## Installation

Install dependencies for the root, frontend, and backend simultaneously:
```bash
npm run install:all
```

## Running the Application

Start both frontend and backend concurrently:
```bash
npm start
```
Alternatively, run them separately:
- **Frontend only:** `npm run start:client` (Runs on http://localhost:5173)
- **Backend only:** `npm run start:server` (Runs on http://localhost:5000)

## Health Endpoint

You can check the API health status at:
`GET /api/v1/health`

## Testing & Linting

Run tests (Backend):
```bash
npm test
```

Run linting across both client and server:
```bash
npm run lint
```

## Phase 0 Limitations
This version serves only as a structural foundation. The UI is a minimal placeholder to verify the stack works, and the API only exposes a health check endpoint.
