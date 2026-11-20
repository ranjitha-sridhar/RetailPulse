# RetailPulse

**AI-Powered Multi-Store Demand Forecasting & Inter-Store Inventory Optimization Platform**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0%2B-646CFF.svg)](https://vitejs.dev/)
[![XGBoost](https://img.shields.io/badge/XGBoost-Forecasting-FF6600.svg)](https://xgboost.readthedocs.io/)
[![Google OR-Tools](https://img.shields.io/badge/Google%20OR--Tools-CP--SAT-4285F4.svg)](https://developers.google.com/optimization)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

**RetailPulse** is an enterprise-grade multi-echelon retail operations platform that bridges the gap between machine learning demand forecasting and operational supply chain execution.

In multi-unit retail networks, localized stockouts often occur concurrently with excess stock at neighboring stores. Traditional systems immediately trigger costly supplier reorders. RetailPulse uses **7-day granular XGBoost demand forecasting** combined with **Google OR-Tools CP-SAT integer programming** to automatically identify, validate, and execute optimal **inter-store inventory transfers** across a 4-store retail network (`CA_1`, `CA_2`, `TX_1`, `WI_1`), dramatically cutting replenishment lead times, freight costs, and inventory holding expenses.

---

## Key Features

### 1. Multi-Store 7-Day Demand Forecasting
- **Machine Learning Engine**: Single-stage XGBoost regression trained with chronological out-of-time splits.
- **Feature Engineering**: Incorporates historical sales lags (t-7, t-14, t-28), rolling averages, day-of-week, month, weekend indicators, and event calendar effects without future data leakage.
- **Network Coverage**: Evaluated across 4 stores and the top 100 high-velocity SKUs (400 store-product combinations).
- **Outperforms Seasonal Baseline**:
  - **RetailPulse XGBoost**: **48.79% WAPE** (MAE: 4.01, RMSE: 6.09)
  - **Seasonal-Naive Baseline**: **59.83% WAPE** (MAE: 4.88, RMSE: 7.12)
  - **Relative Gain**: **+11.04% accuracy improvement** over baseline.

### 2. Intelligent Inter-Store Transfer Optimization (Google OR-Tools)
- **Constraint Programming (CP-SAT)**: Solves a multi-commodity network flow problem to global optimality in under 1 second.
- **Logistics Cost Matrix**: Evaluates tiered freight costs:
  - Intra-state ($1.50/unit)
  - Regional interstate ($2.50/unit)
  - Cross-country interstate ($3.50/unit)
- **Rigorous Operational Constraints**:
  - **No self-transfers** ($x_{i,i,p} = 0$).
  - **Donor surplus cap**: Dispatches cannot exceed transferable stock.
  - **Safety stock strictly preserved**: Donor retains required buffer $\text{Lead Time Demand} + \text{Safety Stock}$.
  - **Recipient limit**: Stores never receive more than their verified shortage.
- **Solver Output**: Generates 153 transfer routes moving 3,430 units, delivering **$77,033.00 in procurement savings** at a freight cost of **$8,717.00** with zero constraint violations.

### 3. Explainable Transfer Recommendations
- Each transfer route generates a dynamic natural-language explanation detailing donor surplus, safety buffer protection, recipient shortage, freight cost, and net savings vs. fresh procurement.

### 4. Enterprise UI Redesign (Red, Grey & White Theme)
- Modern SaaS interface built with React 18, Tailwind CSS, Lucide icons, and Recharts.
- **Executive Command Center**: Live network KPIs, interactive 4x4 inter-store transfer matrix, cross-store demand vs. stock visualizations.
- **Inventory Optimization View**: Store health breakdown, one-click solver execution, sortable recommendations table with contextual *"Why this transfer?"* modal.
- **Store Analytics**: Cross-store benchmarking, net transfer positions, and unmet demand tracking.
- **Forecasting Studio**: Store-product forecast curves with confidence intervals and baseline comparisons.
- **What-If Simulation**: Scenario testing for demand surges, supplier delays, and buffer adjustments.

### 5. Production Backend & Relational Persistence
- High-performance asynchronous FastAPI service.
- SQLite / PostgreSQL database tracking historical optimization runs, individual transfer line items, execution statuses, and user authentication (RBAC for Admins and Store Managers).

---

## Mathematical Optimization Model

RetailPulse models inventory rebalancing as an Integer Linear Program solved via Google OR-Tools CP-SAT:

### Decision Variables
- $x_{i, j, p} \in \mathbb{Z}_{\ge 0}$: Units of SKU $p$ transferred from donor store $i$ to recipient store $j$ ($i \neq j$).
- $u_{j, p} \in \mathbb{Z}_{\ge 0}$: Unmet shortage of SKU $p$ at store $j$ requiring external procurement.

### Objective Function
$$\min \sum_{p \in P} \sum_{i \in S} \sum_{j \in S, j \neq i} c_{i, j} \cdot x_{i, j, p} + \sum_{p \in P} \sum_{j \in S} (C_{\text{procure}} + C_{\text{penalty}}) \cdot u_{j, p}$$

Where:
- $c_{i,j}$ = Distance-based unit freight cost between store $i$ and store $j$.
- $C_{\text{procure}} = \$25.00$ = Default unit cost for emergency external procurement.
- $C_{\text{penalty}} = \$15.00$ = Stockout penalty per unmet unit.

### Core Constraints
1. **Donor Surplus Limit**:
   $$\sum_{j \neq i} x_{i, j, p} \le \text{Transferable Surplus}_{i, p} \quad \forall i \in S, \forall p \in P$$
2. **Safety Stock Buffer Preservation**:
   $$\text{On-Hand Stock}_{i, p} - \sum_{j \neq i} x_{i, j, p} \ge \text{Lead Time Demand}_{i, p} + \text{Safety Stock}_{i, p} \quad \forall i \in S, \forall p \in P$$
3. **Recipient Replenishment Ceiling**:
   $$\sum_{i \neq j} x_{i, j, p} \le \text{Shortage}_{j, p} \quad \forall j \in S, \forall p \in P$$
4. **External Replenishment Balance**:
   $$u_{j, p} = \text{Shortage}_{j, p} - \sum_{i \neq j} x_{i, j, p} \quad \forall j \in S, \forall p \in P$$

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide React, Axios |
| **Backend API** | FastAPI, Uvicorn, Pydantic, Python-Jose (JWT), Passlib (Bcrypt) |
| **Optimization Engine** | Google OR-Tools (`ortools==9.15.6755`, CP-SAT Solver) |
| **Machine Learning** | XGBoost, Scikit-Learn, Pandas, NumPy |
| **Database & Storage** | SQLite (Default embedded) / PostgreSQL compatible, CSV Data Lake |

---

## Project Structure

```
RetailPulse/
├── backend/
│   └── app/
│       ├── auth/               # JWT authentication, password hashing & DB schema
│       │   └── database.py     # SQLite models (users, optimization_runs, transfers)
│       ├── routes/             # FastAPI REST endpoints
│       │   ├── auth.py         # Login, token generation, user management
│       │   ├── dashboard.py    # Command center KPIs & system metrics
│       │   ├── forecast.py     # 4-store forecasting data endpoints
│       │   ├── inventory.py    # Stock levels, risks, and reorder policies
│       │   ├── optimization.py # OR-Tools execution & transfer recommendations
│       │   └── stores.py       # Store profiles & metadata
│       ├── services/           # Business logic layer
│       │   ├── data_service.py # Dataset loaders & metric computation
│       │   └── optimization_service.py # Google OR-Tools CP-SAT bridge
│       └── main.py             # FastAPI application entrypoint & middleware
├── frontend/
│   ├── src/
│   │   ├── components/         # React views
│   │   │   ├── Forecasting.jsx # 4-Store forecast studio
│   │   │   ├── Inventory.jsx   # Stock management & health filters
│   │   │   ├── InventoryOptimization.jsx # Transfer matrix & recommendations
│   │   │   ├── Login.jsx       # Crimson-themed authentication screen
│   │   │   ├── StoreAnalytics.jsx # 4-Store cross-comparison benchmark
│   │   │   ├── Transfers.jsx   # Transfer execution ledger
│   │   │   ├── UserManagement.jsx # RBAC user administration
│   │   │   └── WhatIf.jsx      # Scenario planning simulator
│   │   ├── services/
│   │   │   └── api.js          # Centralized Axios client & API methods
│   │   ├── App.jsx             # Shell layout, navigation & command center
│   │   ├── index.css           # Red, Grey & White design tokens
│   │   └── main.jsx            # React root
│   └── package.json            # Node.js dependencies
├── ml/
│   ├── data/
│   │   ├── forecast_7day_backtest.csv  # 7-day out-of-time backtest predictions
│   │   └── inventory_analysis.csv      # 400 store-product operational inventory records
│   └── build_4store_inventory.py       # 4-Store inventory & scenario pipeline
├── optimization/
│   ├── external_replenishment.csv      # Remaining post-transfer procurement needs
│   ├── store_transfer_summary.csv      # Aggregate outbound/inbound transfer matrix
│   ├── transfer_optimizer.py           # Standalone OR-Tools solver runner
│   ├── transfer_recommendations.csv    # 153 solved transfer routes with explanations
│   └── validate_transfers.py           # Automated physical constraint audit script
├── backups/                            # Safeguarded backups of initial models & data
├── test_e2e_integration.py             # End-to-end automated integration test suite
├── requirements.txt                    # Python dependencies
└── README.md                           # Documentation
```

---

## Getting Started

### Prerequisites
- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.0` or higher (with `npm`)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/RetailPulse.git
cd RetailPulse
```

### 2. Backend Setup
```bash
# Create and activate a Python virtual environment
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at [http://localhost:5173](http://localhost:5173).

---

## Demo Credentials

The local database initializes with two pre-configured roles:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `Admin` | `Admin@123456` | Full system access, OR-Tools solver execution, user management, all 4 stores |
| **Store Manager** | `StoreManager` | `Manager@1234` | Scoped operational access (Store `CA_1`) |

*(Quick 1-click login buttons are also provided on the login page for convenience).*

---

## Testing & Verification

RetailPulse includes comprehensive automated test suites to ensure both physical feasibility of transfers and backend API reliability.

```bash
# Run the complete end-to-end integration test suite
python test_e2e_integration.py

# Run standalone physical constraint verification
python optimization/validate_transfers.py
```

### Verification Checks Performed
- **Check 1**: Zero self-transfers ($i \neq j$).
- **Check 2**: Strictly positive transfer quantities ($x_{i,j,p} > 0$).
- **Check 3**: Outgoing stock $\le$ Transferable surplus for every donor.
- **Check 4**: Safety buffer strictly preserved for every donor node ($\ge \text{Lead Time Demand} + \text{Safety Stock}$).
- **Check 5**: Incoming transfer units $\le$ Verified recipient shortage (no overfilling).
- **Check 6**: All 5 backend API route handlers return HTTP 200 with valid schemas.

---

## Dataset & Provenance Notice

- RetailPulse builds on historical retail sales patterns from the publicly available **Walmart M5 Forecasting competition** dataset.
- In accordance with repository guidelines, massive raw dataset files (`sales_train_validation.csv`, `calendar.csv`, `sell_prices.csv`) are excluded.
- The 4-store network consists of:
  - **`CA_1`, `TX_1`, `WI_1`**: Evaluated on historical out-of-time chronological backtest data.
  - **`CA_2`**: Integrated as an operational expansion scenario tagged explicitly with `inventory_source = "Simulated scenario (CA_2 expansion)"` to validate multi-echelon network balancing without fabricating historical training data.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
