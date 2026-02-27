# gbairai Backend Auth

Passwordless authentication backend for gbairai (Node.js, Express)

## Features
- Email OTP (One-Time Password) authentication
- No password, no secrets in client
- JWT access/refresh tokens
- SQLite for storage (users, auth_codes, sessions)
- Nodemailer for email (configure SMTP in .env)

## Setup
1. `npm install`
2. Create `.env` (see below)
3. `npm run dev` (for development)

## .env Example
```
PORT=4000
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_smtp_password
EMAIL_FROM=gbairai <your@email.com>
```

## Endpoints
- POST /auth/request
- POST /auth/verify
- POST /auth/refresh
- GET /me

See project root for full API contract.
