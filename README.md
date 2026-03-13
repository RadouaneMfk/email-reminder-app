# 📧 Email Reminder App

A full-stack web application that lets users schedule email reminders so they never forget important tasks. Built with Node.js, Express, EJS, and MongoDB.

## 🌐 Live Demo

[https://email-reminder-app-production.up.railway.app](https://email-reminder-app-production.up.railway.app)

---

## ✨ Features

- 📬 Schedule email reminders at a specific date and time
- 🔐 User authentication (Register / Login)
- 🔑 Google OAuth 2.0 login
- ✉️ Email verification with OTP code
- 🔒 Forgot password / Reset password via email link
- ⏰ Automatic email delivery using cron jobs
- 🛡️ Rate limiting and security best practices

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Templating | EJS |
| Database | MongoDB + Mongoose |
| Authentication | Passport.js + session |
| OAuth | Google OAuth 2.0 |
| Email | Brevo API |
| Scheduler | node-cron |
| Hosting | Railway |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB database (MongoDB Atlas recommended)
- Brevo account (for email sending)
- Google Cloud Console project (for OAuth)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/RadouaneMfk/email-reminder-app.git
cd email-reminder-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Create a `.env` file** in the root directory:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Google OAuth
CLIENT_GOOGLE_ID=your_google_client_id
CLIENT_GOOGLE_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Brevo Email
BREVO_API_KEY=your_brevo_api_key
BREVO_EMAIL_SENDER=your_verified_sender@email.com
```

4. **Run the app**
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (`development` / `production`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `SESSION_SECRET` | Secret key for sessions |
| `CLIENT_GOOGLE_ID` | Google OAuth Client ID |
| `CLIENT_GOOGLE_SECRET` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL |
| `BREVO_API_KEY` | Brevo API key for sending emails |
| `BREVO_EMAIL_SENDER` | Verified sender email address on Brevo |


---

## 📁 Project Structure

```
email-reminder-app/
│
├── src/
│   ├── app.js              # Entry point
│   ├── config/
│   │   ├── passport.js     # Passport & Google OAuth config
│   │   └── DbConnect.js           # MongoDB connection
│   ├── models/
│   │   ├── user.js         # User model
│   │   └── reminder.js     # Reminder model
│   ├── middleware/
│   │   ├── validator.js   # Input validation
│   │   └─── auth.js         # Auth middleware
├── views/                  # EJS templates
├── .env                    # Environment variables (not committed)
└── package.json
```

---

## 🔒 Security Features

- Password hashing with bcrypt
- OTP verification for new accounts
- JWT-based password reset tokens
- Rate limiting on sensitive routes
- Input validation and sanitization

---


## 👤 Author

**Radouane Mouafik**  
GitHub: [@RadouaneMfk](https://github.com/RadouaneMfk)