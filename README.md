# StockSmart — Smart Inventory and Billing System (MERN Stack)

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6%2B-brightgreen.svg)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](#license)

**StockSmart** is an enterprise-grade, responsive Point-of-Sale (POS), inventory management, and billing web application designed for retail stores, supermarkets, electronic shops, and wholesalers. Built with real MongoDB persistence, atomic stock updates, and a transparent inventory movement ledger.

---

## 🌟 Key Features

- **⚡ Fast Point-of-Sale (POS) Billing:**
  - Barcode scanning via browser camera (`html5-qrcode`) or handheld USB hardware scanners.
  - Quick product search by SKU, Barcode, or Title.
  - Item-level and bill-level discounts.
  - Dynamic GST calculations (0%, 5%, 12%, 18%, 28%).
  - Multi-mode tender: Cash, UPI, Card, and Customer Credit / On-Account.
  - Cash change calculator and celebratory checkout feedback.
- **📄 Dual-Layout Printable Invoices & PDF:**
  - **Standard Tax Invoice (A4):** Clean enterprise layout with GST breakdown and signature terms.
  - **Thermal Receipt (80mm):** Compact layout optimized for thermal point-of-sale receipt printers.
  - Client-side vector PDF generation using `jspdf` and `jspdf-autotable`.
- **📊 Real-time Stock Ledger & Valuation:**
  - **Immutable Inventory Ledger:** Every stock change (sale, purchase, return, or manual adjustment) records previous stock, delta, new stock, reference number, user, and reason.
  - **Live Inventory Valuation:** Cost valuation (COGS basis) vs. potential retail valuation.
  - **Stock Adjustments:** Mandatory audit reasons (Damaged goods, expired stock, audit count correction, theft).
- **📈 Documented Cost of Goods Sold (COGS) Profit & Loss:**
  - Calculates true gross profit on actual purchase cost snapshot per item.
  - Operating expenses tracker (Rent, utilities, packaging, transport, wages).
  - Net profit and profit margins.
- **👥 Customer & Supplier Ledger:**
  - Customer credit limits, purchase histories, and repayment logging.
  - Supplier purchase orders, stock receipts, and payout tracking.
- **🛡️ Enterprise Security & Multi-Store Isolation:**
  - Role-Based Access Control (Admin, Manager, Cashier).
  - Secure bcrypt password hashing & JWT authentication.
  - Helmet security headers, CORS origin protection, and rate limiting.
  - Protected database deletion: items referenced in historical invoices cannot be silently deleted.

---

## 🏗️ Architecture & Project Structure

```
StockSmart/
├── client/                     # Frontend Application (React + Vite + Tailwind CSS)
│   ├── public/
│   ├── src/
│   │   ├── components/         # BarcodeScannerModal, InvoiceModal, AddEditProductModal, etc.
│   │   ├── context/            # AuthContext (JWT, user, store state)
│   │   ├── layouts/            # Sidebar, Navbar, MainLayout
│   │   ├── pages/              # Dashboard, POS, Products, Purchases, Sales, Reports, etc.
│   │   ├── services/           # Axios client with JWT interceptor (api.js)
│   │   ├── utils/              # formatters.js (currency, dates, badges)
│   │   ├── App.jsx             # React Router with protected route guards
│   │   ├── index.css           # Tailwind CSS directives and print stylesheets
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js          # Vite config with /api proxy to port 5000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── server/                     # Backend API (Node.js + Express + Mongoose)
│   ├── config/                 # db.js (MongoDB connection)
│   ├── controllers/            # auth, product, sale, purchase, inventory, report, etc.
│   ├── middleware/             # auth (JWT), role (RBAC), error handler, rateLimiter
│   ├── models/                 # Mongoose schemas: Store, User, Product, Sale, Purchase, etc.
│   ├── routes/                 # Express routers mounted under /api/*
│   ├── scripts/                # seed.js (comprehensive Indian retail sample data)
│   ├── tests/                  # api.test.js (Jest & Supertest automated test suite)
│   ├── app.js                  # Express application setup
│   ├── server.js               # Entry point
│   ├── .env.example
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** >= v18 (Tested on v24)
- **MongoDB** running locally on port 27017 or a MongoDB Atlas connection string.

### 1. Clone & Setup Backend
```bash
cd server
npm install
cp .env.example .env
```
Edit `server/.env` if your MongoDB URI differs:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stocksmart
JWT_SECRET=stocksmart_super_secret_jwt_key_2026_change_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

### 2. Seed Database with Realistic Demo Data
```bash
npm run seed
```
This initializes the demo store (**StockSmart SuperMart & Electronics**) populated with categories, products with realistic barcodes, supplier accounts, customers with credit balances, historical sales, and operating expenses.

### 3. Setup Frontend
In a new terminal:
```bash
cd client
npm install
npm run dev
```

The frontend will run at `http://localhost:5173/` and proxy all `/api` calls to the backend on `http://localhost:5000/`.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@stocksmart.com` | `password123` | Full Access (Store settings, staff management, financials, product delete) |
| **Manager** | `manager@stocksmart.com` | `password123` | Inventory, purchase orders, customer & supplier management, staff view |
| **Cashier** | `cashier@stocksmart.com` | `password123` | POS Billing, invoice generation, customer lookup, sales history view |

---

## 🧪 Automated Testing

StockSmart includes an automated test suite verifying business calculations, role-based authorization, inventory consistency, and atomic stock validation.

Run the test suite in the `server` directory:
```bash
cd server
npm test
```
Outputs:
```
PASS tests/api.test.js
  Authentication & Store Isolation
    ✓ should reject unauthenticated requests to protected routes
    ✓ should return current user profile and store for valid token
    ✓ should enforce role-based authorization: cashier cannot delete products
  Product & Inventory Flow
    ✓ should fetch active products with category population
    ✓ should find product by barcode scan
    ✓ should perform stock adjustment with mandatory reason and ledger entry
  POS Billing & Sales Transaction Integrity
    ✓ should process a sale, deduct stock atomically, and calculate server total
    ✓ should reject sale if requested quantity exceeds stock without negative stock allowed
  Dashboard & Reports Analytics
    ✓ should return real-time calculated business statistics
```

---

## 📡 Backend API Reference

All protected endpoints require `Authorization: Bearer <JWT_TOKEN>`.

### Authentication & Users
- `POST /api/auth/register` — Register initial store and administrator account.
- `POST /api/auth/login` — Login user with email & password.
- `GET  /api/auth/me` — Get current authenticated user profile and store details.
- `PUT  /api/auth/profile` — Update user profile.
- `PUT  /api/auth/change-password` — Change password.
- `GET  /api/users` — List staff members for current store *(Admin/Manager)*.
- `POST /api/users` — Create cashier or manager *(Admin)*.

### Products & Inventory
- `GET  /api/products` — List products (search, category filter, stock status, pagination).
- `GET  /api/products/barcode/:barcode` — Fast barcode/SKU lookup for POS scanners.
- `POST /api/products` — Create product with opening stock ledger entry *(Admin/Manager)*.
- `PUT  /api/products/:id` — Update product details *(Admin/Manager)*.
- `DELETE /api/products/:id` — Safe delete/deactivation *(Admin)*.
- `GET  /api/products/export-csv` — Download products as CSV spreadsheet.
- `POST /api/products/import-csv` — Bulk upload products from CSV data *(Admin/Manager)*.
- `GET  /api/inventory` — Live inventory summary and stock valuation.
- `GET  /api/inventory/ledger` — Complete inventory movement transaction ledger.
- `POST /api/inventory/adjust` — Manual stock adjustment with mandatory reason *(Admin/Manager)*.

### POS & Sales
- `POST /api/sales` — Complete POS sale: server calculates totals/taxes, deducts stock atomically, writes ledger, records payment, and creates invoice.
- `GET  /api/sales` — List historical sales invoices with date range filters.
- `GET  /api/sales/:id` — Get invoice details for viewing/printing.
- `POST /api/sales/:id/cancel` — Controlled cancellation with inventory reversal *(Admin/Manager)*.
- `POST /api/returns/sale` — Process customer sale returns and restock items *(Admin/Manager)*.

### Purchases & Suppliers
- `GET  /api/purchases` — List purchase orders.
- `POST /api/purchases` — Record goods receipt, update product cost, intake stock, and update supplier dues.
- `GET  /api/suppliers` — List suppliers and balance payables.
- `POST /api/suppliers` — Add new vendor *(Admin/Manager)*.
- `POST /api/payments/supplier` — Record payout to supplier *(Admin/Manager)*.

### Customers & Payments
- `GET  /api/customers` — List customers and credit balances.
- `POST /api/customers` — Register new customer.
- `POST /api/payments/customer` — Record payment receipt against customer balance dues.
- `GET  /api/payments` — Complete audit ledger of all financial inflows and outflows.

### Reports & Dashboard
- `GET /api/reports/dashboard` — Live KPI statistics, 7-day trend charts, bestsellers, and alerts.
- `GET /api/reports/sales` — Filtered sales aggregation.
- `GET /api/reports/profit-loss` — Cost of Goods Sold (COGS) Income Statement & operating expense breakdown.
- `GET /api/expenses` — Operational expenses ledger.

---

## ☁️ Deployment Instructions for AWS EC2

### Step 1: Launch EC2 Instance
1. Launch an **Ubuntu 24.04 LTS** `t3.medium` or `t3.small` instance on AWS EC2.
2. In Security Group settings, open:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)

### Step 2: Install Node.js, MongoDB & Nginx
Connect to your EC2 instance via SSH:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl gnupg git nginx

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager
sudo npm install -g pm2

# Install MongoDB Community Server
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
```

### Step 3: Clone Code & Configure Environment
```bash
git clone <YOUR_REPOSITORY_URL> /var/www/stocksmart
cd /var/www/stocksmart/server
npm install --production
cp .env.example .env
```
Set your production environment variables in `/var/www/stocksmart/server/.env`:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/stocksmart
JWT_SECRET=generate_a_long_random_64_char_secret_string
CLIENT_URL=https://your-domain.com
```

### Step 4: Build Client Bundle
```bash
cd /var/www/stocksmart/client
npm install
npm run build
```
The optimized production frontend will be compiled to `/var/www/stocksmart/client/dist`.

### Step 5: Start Backend with PM2
```bash
cd /var/www/stocksmart/server
pm2 start server.js --name "stocksmart-api"
pm2 save
pm2 startup
```

### Step 6: Configure Nginx as Reverse Proxy
Create `/etc/nginx/sites-available/stocksmart`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend Single Page App
    location / {
        root /var/www/stocksmart/client/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/stocksmart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Enable SSL with Let's Encrypt Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Certbot will automatically install the certificate, configure HTTPS, and handle SSL renewals.

---

## 📄 License
This project is licensed under the MIT License.
