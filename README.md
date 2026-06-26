# 📈 Thesis Tracker

A full-stack investment thesis validation dashboard that helps investors track stocks and validate their BUY/HOLD/SELL thesis against live financial data.

🌐 **Live App:** https://stock-thesis-tracker.vercel.app  
🔗 **Backend API:** https://stock-thesis-tracker.onrender.com

---

## 🚀 Features

- **Authentication** — Secure JWT-based login/register with bcrypt password hashing
- **Watchlist** — Track US and Indian stocks with labels (Sector, Cap Size, Strategy)
- **Thesis Builder** — Set BUY/HOLD/SELL conditions based on 30+ financial metrics
- **Live Evaluation** — Conditions are evaluated against real-time financial data
- **Financials Tab** — Screener-style view of 30+ metrics per stock
- **Notes** — Personal notes per stock
- **Filters & Sorting** — Filter by market, sector, cap size, strategy, thesis status
- **Admin Panel** — View all users, their watchlists, manage roles (RBAC)
- **Responsive Design** — Works on mobile and desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS + Zustand |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt |
| Stock Data | Alpha Vantage API |
| Deployment | Vercel (Frontend) + Render (Backend + DB) |

---

## 📁 Project Structure

```
stock-thesis-tracker/
├── frontend/                 # React + Vite app
│   ├── src/
│   │   ├── pages/            # Login, Register, Dashboard, StockDetail, Admin
│   │   ├── components/       # Reusable UI components
│   │   ├── store/            # Zustand global state
│   │   └── lib/              # Axios API client
│   └── vercel.json           # Vercel routing config
│
└── backend/                  # Node.js + Express API
    ├── routes/               # auth, watchlist, stock, thesis, notes, admin
    ├── middleware/           # JWT authentication + admin authorization
    ├── lib/                  # Prisma client
    └── prisma/               # Database schema + migrations
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |

### Watchlist
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/watchlist` | Get user's watchlist (supports filters) |
| POST | `/api/watchlist` | Add stock to watchlist |
| PUT | `/api/watchlist/:id` | Update stock labels |
| DELETE | `/api/watchlist/:id` | Remove stock from watchlist |

### Stock
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stock/search?q=apple&market=US` | Search for stocks |
| GET | `/api/stock/:symbol/financials?market=US` | Get live financial data |

### Thesis
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/thesis/:watchlistItemId` | Get all thesis cases for a stock |
| POST | `/api/thesis/:watchlistItemId` | Create/update a thesis case |
| DELETE | `/api/thesis/:caseId` | Delete a thesis case |

### Notes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notes/:watchlistItemId` | Get all notes for a stock |
| POST | `/api/notes/:watchlistItemId` | Add a note |
| PUT | `/api/notes/:noteId` | Edit a note |
| DELETE | `/api/notes/:noteId` | Delete a note |

### Admin (Admin only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | Get all users |
| GET | `/api/admin/users/:id` | Get specific user's dashboard |
| PUT | `/api/admin/users/:id/role` | Change user role |
| DELETE | `/api/admin/users/:id` | Delete a user |

---

## 🗄️ Database Schema

```
User
 └── WatchlistItem (one user has many stocks)
      ├── ThesisCase (BUY / HOLD / SELL)
      │    └── ThesisCondition (metric, operator, value)
      └── Note
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL
- Git

### Backend
```bash
cd backend
npm install
# Create .env file with DATABASE_URL, JWT_SECRET, PORT, ALPHA_VANTAGE_KEY
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🌍 Deployment

- **Frontend:** Vercel (auto-deploys on push to main)
- **Backend + DB:** Render (auto-deploys on push to main)
- **Environment variables** stored securely in Vercel and Render dashboards

---

## 👨‍💻 Author

Pranav — Full Stack Developer
