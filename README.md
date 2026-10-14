# 🧾 Retail POS & Cloud Billing Software System

A comprehensive, full-featured MERN-stack Retail Billing, Inventory Management, and Point-of-Sale (POS) ERP solution built with **React (Vite)**, **Node.js/Express**, and **MongoDB**. Features enterprise-grade **Role-Based Access Control (RBAC)** across four distinct operational roles.

---

## 🌟 Key Highlights & Modules

### 1. 🔐 Role-Based Access Control (RBAC) & Security
- **Strict Role Permissions:** Pre-configured workflows for `ADMIN`, `MANAGER`, `CASHIER`, and `STAFF`.
- **JWT & Session Security:** Token-based authentication, HTTP header authorization, route guards, and automatic redirects based on user role.
- **Google OAuth 2.0 Integration:** Quick sign-in with Google for approved team members.
- **Password Recovery:** Secure OTP-based reset workflow via email (Nodemailer/SMTP).
- **Deactivation Guards:** Immediate access revocation for deactivated user accounts.

### 2. 🛒 Point of Sale (POS) Billing & Checkout
- **High-Speed Counter Billing:** Designed for fast cashier operations with live product search, quantity adjustments, and auto-tax calculation.
- **Multiple Payment Modes:** Supports Cash, UPI, Cards, Bank Transfer, and Credit.
- **Instant Receipt & Invoice Generation:** Real-time billing with automated inventory deduction.

### 3. 📦 Catalog & Inventory Control
- **Products & Categories:** Complete SKU, barcodes, category grouping, cost price, and selling price tracking.
- **Stock Tracking & Low Stock Alerts:** Live inventory count, low-stock warning indicators, and out-of-stock badges.
- **Stock Deduction on Sale:** Automated inventory reconciliation upon checkout or return.

### 4. 📈 Sales & Invoices Management
- **Sales History:** Track all customer sales orders, item breakdowns, total revenue, and order status (`Paid`, `Pending`, `Partially Paid`).
- **GST Tax Invoices:** Compliant tax invoices with business details, HSN codes, customer tax info, and print preview.
- **Sales Returns:** Process customer returns with automated stock replenishment and refund tracking.

### 5. 🚚 Purchases & Supplier Management
- **Purchase Orders (PO):** Create purchase orders from suppliers, track incoming shipments, and update inventory.
- **Supplier Directory:** Manage vendor contacts, payment histories, and supply records.

### 6. 💳 Payments & Accounts Ledger
- **Payment Tracking:** Record full or partial payments against invoices.
- **Overpayment Prevention:** Built-in validation guarding against overpaying invoices.
- **Status Sync:** Live payment status updates across related sales orders and invoices.

### 7. 📊 Reports & Analytics
- **Sales Reports:** Daily, weekly, monthly sales summaries, revenue totals, and transaction volumes.
- **Profit & Loss Reports:** Gross revenue vs. purchase costs and operational expenses.
- **Stock Reports:** Valuation of remaining inventory and low-stock analysis.
- **Interactive Dashboard:** Live KPIs, revenue charts, recent transactions, and low stock warnings.

### 8. ⚙️ Business Settings & User Administration
- **Business Profile:** Configurable company name, GSTIN, phone, address, tax rate preferences, and custom invoice logos.
- **User Management:** Admin portal to invite users, assign roles, reset credentials, and activate/deactivate accounts.

---

## 👥 Role Permissions Matrix

| Feature / Module | ADMIN | MANAGER | CASHIER | STAFF |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard & KPIs** | Full | View Only | ❌ No Access | ❌ No Access |
| **User Management** | Full | ❌ No Access | ❌ No Access | ❌ No Access |
| **Business Settings** | Full | View Only | View Only | View Only |
| **Products & Categories** | Full | Full | View Only (for POS) | Full |
| **Inventory Management** | Full | Full | ❌ No Access | Full |
| **Purchases & Suppliers** | Full | Full | ❌ No Access | ❌ No Access |
| **Customers** | Full | Full | Full | ❌ No Access |
| **POS Billing (`/billing`)** | Full | Full | **Full (Primary)** | ❌ No Access |
| **Sales (`/sales`)** | Full | Full | **View Only** | ❌ No Access |
| **Invoices (`/invoices`)** | Full | Full | **View Only** | ❌ No Access |
| **Sales Returns** | Full | Full | ❌ No Access | ❌ No Access |
| **Payments** | Full | View Only | **Manage Payments** | ❌ No Access |
| **Expenses** | Full | Full | ❌ No Access | ❌ No Access |
| **Reports & Analytics** | Full | Full | ❌ No Access | ❌ No Access |

> **Role Landing Pages:**
> - `ADMIN` & `MANAGER` ➡️ `/dashboard`
> - `CASHIER` ➡️ `/billing` (POS Counter)
> - `STAFF` ➡️ `/inventory`

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **Routing:** React Router DOM v6 (Nested Layouts, Protected & Role Routes)
- **Styling:** Modern Vanilla CSS Design System (Glassmorphism, Vibrant Dark/Light Accents, Responsive Tables & Mobile Cards)
- **Icons:** React Icons (`react-icons/fi`)
- **HTTP Client:** Axios (Interceptors for Bearer Token handling)
- **Authentication:** Google OAuth (`@react-oauth/google`)

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB Atlas via Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs password hashing
- **File Uploads:** Multer (Business Logo uploads)
- **Email Service:** Nodemailer (OTP password recovery)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- Git

---

### 1. Clone & Setup Repository
```bash
git clone <repository-url>
cd Billing-Team-1-Auth-Users
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/billing_db
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Admin Defaults (for seed script)
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
ADMIN_PHONE=9876543210

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Email (SMTP / Gmail for OTP Password Reset)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Billing Support <no-reply@billingapp.com>
```

Seed initial database (Admin, default roles, categories, products, customers):
```bash
npm run seed
```

Start the backend server:
```bash
# Production mode
npm start

# Development watch mode
npm run dev
```
> Server runs at: `http://localhost:5000`

---

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Start Vite dev server:
```bash
npm run dev
```
> Client runs at: `http://localhost:5173`

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `Admin@123` | Full access across all modules |
| **MANAGER** | `manager@example.com` | `Manager@123` | Products, Purchases, Sales, Reports, Inventory |
| **CASHIER** | `cashier@example.com` | `Cashier@123` | POS Billing, Payments, Sales & Invoices (View Only) |
| **STAFF** | `staff@example.com` | `Staff@123` | Inventory, Products, Categories |
| **INACTIVE** | `inactive@example.com` | `Inactive@123` | Account blocked (403 test account) |

---

## 🔌 API Endpoints Reference

### Authentication & Profile (`/api/auth`)
- `POST /api/auth/login` - Authenticate user & issue JWT
- `POST /api/auth/google` - Google OAuth authentication
- `POST /api/auth/forgot-password` - Request 6-digit email OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/reset-password` - Set new password with verified OTP
- `GET /api/auth/me` - Fetch authenticated user profile

### User Administration (`/api/users`)
- `GET /api/users` - List users (Search, role filter, pagination)
- `POST /api/users` - Create new system user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user information
- `PATCH /api/users/:id/status` - Toggle Active/Inactive status
- `DELETE /api/users/:id` - Delete user account

### Business Settings (`/api/business`)
- `GET /api/business` - Get business profile & invoice settings
- `PUT /api/business` - Update business details, tax info, and logo

### Catalog & Inventory
- `/api/products` - Product catalog management
- `/api/categories` - Product category grouping
- `/api/inventory` - Stock levels & inventory adjustments

### Billing, Sales & Invoices
- `POST /api/sales` - Record new retail / POS sale
- `GET /api/sales` - Retrieve sales order history
- `GET /api/sales/:id` - Get detailed sale breakdown
- `/api/invoices` - Generate, view, and track tax invoices
- `/api/returns` - Process return transactions

### Payments & Reports
- `/api/payments` - Record invoice payments and receipts
- `/api/reports/sales` - Sales analytics & revenue reports
- `/api/reports/profit` - Profit & Loss calculation
- `/api/reports/stock` - Inventory valuation & low stock report

---

## 📁 Project Directory Structure

```text
billing_system_software/
├── client/
│   ├── public/                # Static assets & favicon
│   ├── src/
│   │   ├── components/        # Layout (Sidebar, Navbar), Common UI (Modals, Badges, Tables, KPI)
│   │   ├── config/            # RBAC permissions (permissions.js)
│   │   ├── context/           # AuthContext & global state
│   │   ├── pages/             # Auth, Dashboard, Billing, Sales, Invoices, Products,
│   │   │                      # Inventory, Purchases, Customers, Payments, Reports, etc.
│   │   ├── routes/            # ProtectedRoute & Role Guards
│   │   ├── services/          # Axios API clients & service layers
│   │   ├── utils/             # Formatters (currency, dates, quantities)
│   │   ├── App.jsx            # Main route configuration
│   │   └── main.jsx           # App entry point
│   ├── package.json
│   └── vite.config.js
│
└── server/
    ├── config/                # Database connection & permissions configuration
    ├── controllers/           # API request controllers for all modules
    ├── middleware/            # Auth, RBAC, input validators, stock checks
    ├── models/                # Mongoose database models
    ├── routes/                # Express API modular route definitions
    ├── seed/                  # Database seeding scripts (seedAll.js, seedAdmin.js)
    ├── tests/                 # RBAC & system integration verification tests
    ├── server.js              # Server bootstrapper & Express application
    └── package.json
```

---

## 👥 Final Team Allocation (5 Engineering Teams)

This Retail POS & Billing System is an integrated multi-module solution collaboratively engineered across 5 specialized teams:

---

### 🔐 Team 1 — Authentication, Users & Business Settings
**Module Scope:** Login, JWT, User Roles, User Management & Business Settings

* 👑 **Team Lead:** **Sreeja Kilari** (`Team Lead / Backend`)

**Team Members:**
| Member Name | Responsibility |
| :--- | :--- |
| **Kranthi Kumar Mandadi** | Backend / Database |
| **Saiteja 22G21A3138** | Frontend |
| **Shaik Sharief** | Integration / Testing |

---

### 📦 Team 2 — Products, Categories & Inventory
**Module Scope:** Products, Categories, Stock Management & Low-Stock Alerts

* 👑 **Team Lead:** **Nellagorla Vamsi** (`Team Lead / Backend`)

**Team Members:**
| Member Name | Responsibility |
| :--- | :--- |
| **Yelchuru Reeshika** | Backend / Database |
| **Munipavan CH** | Frontend |
| **Kanchi Sathwika** | Testing / Integration |

---

### 🤝 Team 3 — Customers, Suppliers & Purchases
**Module Scope:** Customer Management, Supplier Management & Purchase Processing

* 👑 **Team Lead:** **Ramcharan Polepalli** (`Team Lead / Backend`)

**Team Members:**
| Member Name | Responsibility |
| :--- | :--- |
| **Shaik Tanveez** | Backend / Database |
| **Renukumar Challa** | Frontend |
| **Bhargavi Chinega** | Integration / Testing |

---

### 🧾 Team 4 — Sales, Billing & Invoices
**Module Scope:** Sales, Billing, Invoice Generation & Returns

* 👑 **Team Lead:** **Mamidi Lakshmi Reddy** (`Team Lead / Backend`)

**Team Members:**
| Member Name | Responsibility |
| :--- | :--- |
| **Harshavardhan Kummetha** | Backend / Database |
| **Siva Kasthuri Prasad Vempuluru** | Frontend |
| **Venkata Varsha Atmakuru** | Integration / Testing |

> 📌 **Note:** Coordinates closely with Teams 1, 2, and 3 as the core retail billing and sales engine.

---

### 📊 Team 5 — Payments, Expenses, Dashboard & Reports
**Module Scope:** Payments, Expenses, Dashboard & Reports

* 👑 **Team Lead:** **Vamsi Chillakuru** (`Team Lead / Backend`)

**Team Members:**
| Member Name | Responsibility |
| :--- | :--- |
| **Shaik Abbu Bakar** | Backend / Database |
| **Kalyanbabu Erla** | Frontend |
| **Gurram Gowri** | Integration / Testing |

---

### 📋 Consolidated Teams Summary

| Team | Module Name | Team Lead | Members & Roles |
| :--- | :--- | :--- | :--- |
| **Team 1** | Authentication, Users & Business Settings | **Sreeja Kilari** | Kranthi Kumar (Backend/DB), Saiteja (Frontend), Shaik Sharief (Integration/QA) |
| **Team 2** | Products, Categories & Inventory | **Nellagortla Vamsi** | Yelchuru Reeshika (Backend/DB), Munipavan CH (Frontend), Kanchi Sathwika (Testing/QA) |
| **Team 3** | Customers, Suppliers & Purchases | **Ramcharan Polepalli** | Shaik Tanveez (Backend/DB), Renukumar Challa (Frontend), Bhargavi Chinega (Integration/QA) |
| **Team 4** | Sales, Billing & Invoices | **Mamidi Lakshmi Reddy** | Harshavardhan (Backend/DB), Siva Kasthuri Prasad (Frontend), Venkata Varsha (Integration/QA) |
| **Team 5** | Payments, Expenses, Dashboard & Reports | **Vamsi Chillakuru** | Shaik Abbu Bakar (Backend/DB), Kalyanbabu Erla (Frontend), Gurram Gowri (Integration/QA) |

---

## 📄 License
This project is proprietary software developed for retail billing and point-of-sale management.
