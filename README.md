# Feastory 2.0 — Canteen Order Management System

Rebuild of the original Feastory (HTML/AngularJS + Supabase) as **React (Vite) + Python (FastAPI) + MongoDB (Atlas)**, deployable on AWS. Same look, same pages, same flow — plus proper auth, a real relational schema, and an **Add Dish** feature for the canteen manager.

```
feastory/
├── frontend/          React app (original style.css + images reused as-is)
│   └── src/pages/     one component per original .html page
├── backend/           FastAPI + PyMongo
│   ├── app/routers/   auth, menu, cart, orders/wallet, admin, feedback
│   ├── app/db.py      connection, collections, indexes
│   └── db/collections.md  MongoDB data model (DBMS deliverable)
├── docker-compose.yml one-command local stack (MongoDB + API + nginx)
└── DEPLOY_AWS.md      step-by-step AWS deployment
```

## Run locally (2 terminals)

**Backend** — needs a MongoDB. Pick one:
- **Atlas (online, free)**: create a free M0 cluster (see `DEPLOY_AWS.md` §1) and put its connection string in `backend/.env` as `MONGO_URL=mongodb+srv://…`
- **Local mongod**: `MONGO_URL=mongodb://localhost:27017`
- **Nothing installed**: `MONGO_URL=mock://` runs an in-memory emulator (data lost on restart)

```bash
cd backend
cp .env.example .env                                   # edit MONGO_URL
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173  (Vite proxies /api to the backend)
```

Or everything in Docker (bundles a local MongoDB): `docker compose up --build` → http://localhost

### Default accounts
| Role | Login |
|---|---|
| Canteen manager | Emp ID `1234567890`, PIN `1234` |
| Student | register on the site (11-digit SAP ID, password with upper/lower/digit/symbol). New students get ₹500 demo wallet balance. |

## Features

**Student**
- Register / login (JWT), same validation rules as the original
- Home slider, categories, **today's most ordered dishes** (falls back to latest dishes until the first order of the day); menu with search + category filter
- Cart (qty edit, remove, clear) → checkout with eWallet → PDF bill → order tracking (placed → ready to pick → served)
- Profile with wallet balance, **top-up**, and transaction history
- **Give feedback** (name, phone, e-mail, 1–5 stars, message) → stored in DB, e-mailed to the canteen via Web3Forms, and shown live under *customer reviews* on the About page

**Canteen manager**
- Emp ID + PIN login; home page shows only the banner
- Orders board: Pending → Ready to Serve → Served, auto-refreshing
- Menu management: **+ Add Dish** (name, price, category — existing or new —, calories, image upload to S3/local), mark sold-out/available, delete

**Backend / DBMS (MongoDB)**
- Collections: `students`, `canteen_staff`, `categories`, `dishes`, `carts` (items embedded), `orders` (items embedded), `wallet_transactions`, `feedback`, `counters` — see `backend/db/collections.md`
- Unique indexes (email, dish/category name case-insensitive, order number); dish name/price snapshotted inside orders
- Checkout is a multi-document transaction on Atlas; wallet debit is a conditional `$inc` so the balance can never go negative even under concurrent checkouts
- bcrypt-hashed passwords/PINs; role-based JWT (student vs staff)
- Images: local disk in dev, S3 in prod (`STORAGE_BACKEND=s3`)

## API overview
```
POST /api/auth/student/register   POST /api/auth/student/login   GET /api/auth/student/me
POST /api/auth/staff/login        GET  /api/auth/staff/me
GET  /api/menu?q=&category=&limit=            GET /api/menu/categories
GET  /api/cart   POST /api/cart   PATCH /api/cart/{id}   DELETE /api/cart/{id}   DELETE /api/cart
POST /api/orders/checkout         GET  /api/orders
POST /api/wallet/topup            GET  /api/wallet/transactions
POST /api/feedback                GET  /api/feedback?limit=      (public reviews)
GET  /api/menu/popular?limit=     (most ordered since midnight, TIMEZONE)
--- staff only ---
GET  /api/admin/dishes   POST /api/admin/dishes (multipart)   PATCH/DELETE /api/admin/dishes/{id}
GET  /api/admin/orders?status=placed|ready|served   PATCH /api/admin/orders/{id}/status
```
Interactive docs at `/docs` when the backend is running.

## Configuration
Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env`. See comments inside; AWS values are explained in `DEPLOY_AWS.md`.

## Original → new mapping
| Original | New |
|---|---|
| `home.html` … `canteenorders.html` | `frontend/src/pages/*.jsx` (routes listed in `App.jsx`) |
| `css/style.css` | `frontend/src/styles/style.css` (unchanged) + `additions.css` |
| `images/` | `frontend/public/images/` |
| Supabase tables `studentSignUp`, `canteenSignUp`, `Menu`, `temp_cart`, `Orders` | see `backend/db/collections.md` |
| Supabase Storage `foodpics` | S3 bucket / `backend/uploads` |
| `contact.html` + web3forms | `/feedback` page → `feedback` collection + web3forms e-mail + About-page reviews (`/contact` redirects) |
| `login` flag column | JWT in `localStorage` |
