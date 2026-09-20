# BloodChain AI — Uncertainty-Aware Multi-Hospital Blood Supply Chain Platform

**BloodChain AI** is a research-oriented, uncertainty-aware decision-support system for multi-hospital blood supply chain management, probabilistic demand forecasting, and emergency redistribution.

---

## ⚠️ System Status & Security Disclaimer

> [!IMPORTANT]
> **"This is a synthetic-data prototype and is not validated for clinical deployment."**
>
> **"Header-based demo identity and AllowAny authentication are not suitable for production security."**

### Verification Matrix & Status Breakdown

| Domain | Status | Details & Verification Scope |
| :--- | :--- | :--- |
| **Django DRF Backend** | **VERIFIED LOCALLY** | 17/17 Django unit tests passing (`python manage.py test`). Complete state machine, FEFO allocation, and append-only audit enforcement verified. |
| **Frontend Application** | **VERIFIED LOCALLY** | 9/9 frontend logic tests passing (`safe-to-share.test.ts`, `system-hardening.test.ts`). `npm run build` succeeds with zero TypeScript errors. |
| **FastAPI ML Service** | **VERIFIED LOCALLY** | FastAPI `/health` endpoint HTTP 200. XGBoost, Seasonal Naive, and Google OR-Tools optimization engines validated locally. |
| **SQLite Persistence** | **VERIFIED LOCALLY** | Default development database `db.sqlite3` initialized and verified with all 7 Django app migrations (`makemigrations --check` passed). |
| **PostgreSQL / Neon** | **CONFIGURATION READY** | `config/settings/base.py` supports `DATABASE_URL` with `sslmode=require` parsing. Remote connection not tested as cloud credentials were not provided. |
| **Authentication** | **DEMO ONLY** | `AllowAny` permissions with header-based identity (`X-User-Role`, `X-User-Name`). Requires JWT / DRF Token migration for production. |
| **Concurrency** | **DEMO / SQLITE** | Transaction boundaries and `select_for_update()` applied. Row-level concurrency depends on PostgreSQL in production. |
| **Clinical Validation** | **NOT VALIDATED** | Synthetic regional datasets used. ABO/Rh compatibility and transfusion protocols are demo representations only. |

---

## Architecture Overview

- **Frontend**: React 18 + Vite + TypeScript (Single-page command-center application)
- **Application Backend**: Django REST Framework (Port 8000)
- **ML & Optimization Backend**: Python FastAPI service (Port 8001, `ml-service/app/main.py`)
- **Forecasting Models**: XGBoost Regressor (with residual quantile intervals), Seasonal Naive, Holt-Winters Exponential Smoothing
- **Redistribution Solver**: Google OR-Tools (Mixed-Integer Linear Programming - MILP)
- **Local Persistence**: Django ORM (SQLite / PostgreSQL ready) & Zustand state stores
- **Authentication**: Local role-based demo provider (`X-User-Role` header)

---

## Feature Implementation Matrix

### 1. CURRENTLY IMPLEMENTED & VERIFIED
| Feature | Implementation Details | Location |
| :--- | :--- | :--- |
| **Safe-to-Share Engine** | $\text{Safe-to-Share} = \max(0, \text{Inventory} - \text{Reserved} - \text{Protection})$, $\text{Protection} = \text{P90} + \text{Buffer}$ | [`src/lib/safe-to-share.ts`](file:///d:/BloodChain/src/lib/safe-to-share.ts), [`apps/inventory/services.py`](file:///d:/BloodChain/backend/apps/inventory/services.py) |
| **FEFO Expiry Rescue** | First Expiry First Out batching sorted by `expiryDate`, matching expiring stock to deficits | [`src/lib/fefo-engine.ts`](file:///d:/BloodChain/src/lib/fefo-engine.ts), [`apps/inventory/services.py`](file:///d:/BloodChain/backend/apps/inventory/services.py) |
| **Role Access Security** | DRF ViewSet enforcement rejecting unauthorized roles (`HOSPITAL_STAFF` on approval/dispatch) | [`apps/transfers/views.py`](file:///d:/BloodChain/backend/apps/transfers/views.py) |
| **Transfer State Machine** | Atomic idempotent inventory reconciliation (`PENDING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `RECEIVED`) | [`apps/transfers/views.py`](file:///d:/BloodChain/backend/apps/transfers/views.py) |
| **Emergency Network Simulator** | Digital-twin-style simulation testing Mass Casualty (+100%), Flooding (-40%), and Power Outages | [`EmergencySimulationCenter.tsx`](file:///d:/BloodChain/src/features/simulation/EmergencySimulationCenter.tsx) |
| **Append-Only Audit Ledger** | Immutability-enforced Django model blocking updates and single/bulk deletions | [`apps/audit/models.py`](file:///d:/BloodChain/backend/apps/audit/models.py) |
| **OR-Tools Allocator** | Solver enforcing candidate source `safe_share_units` as strict upper bound constraint | [`ml-service/optimization/allocator.py`](file:///d:/BloodChain/ml-service/optimization/allocator.py) |
| **Interval & Metric Evaluation** | PICP (Interval Coverage Probability), Mean Interval Width, MAE, WAPE, MASE, Bias metrics | [`ml-service/forecasting/models.py`](file:///d:/BloodChain/ml-service/forecasting/models.py) |

### 2. DEMO / SYNTHETIC COMPONENTS
| Component | Scope & Disclaimer |
| :--- | :--- |
| **Datasets** | Synthetic regional multi-hospital historical demand and batch inventory data |
| **Authentication** | Local role-based switcher (`DEMO LOCAL AUTH` — header-based identity) |
| **Blood Compatibility** | Standard ABO/Rh rules (`Demo compatibility rules — requires clinical validation`) |
| **Interval Estimation** | Empirical residual quantile percentiles (`Estimated prediction interval`) |
| **Digital Twin** | Network simulation model (`Network simulation / digital-twin-style simulation`) |

### 3. NOT YET IMPLEMENTED / OUT OF SCOPE
- Real hospital EHR / HIS integration (FHIR / HL7)
- Firebase Authentication / Production OAuth2 JWT tokens
- Real IoT cold-chain hardware sensor telemetry
- Blockchain / Smart contract ledgers
- Federated learning / Graph Neural Networks (GNN) / Temporal Fusion Transformers (TFT)
- Production cloud deployment infrastructure
- Clinical transfusion validation

---

## Safe-to-Share Formula & Logic

$$\text{SAFE\_TO\_SHARE} = \max(0, \text{CURRENT\_INVENTORY} - \text{RESERVED\_STOCK} - \text{PROTECTION\_LEVEL})$$

Where $\text{PROTECTION\_LEVEL} = \text{P90 Forecast Demand} + \text{Safety Buffer}$.

---

## Quickstart Instructions

### Run Django Backend Test Suite
```bash
cd backend
python manage.py test
```

### Run Frontend Automated QA & Hardening Test Suite
```bash
npx tsx src/lib/__tests__/system-hardening.test.ts
npx tsx src/lib/__tests__/safe-to-share.test.ts
```

### Build & Run Frontend Application
```bash
# Install packages
npm install

# Run dev server
npm run dev

# Compile production bundle
npm run build
```

### Run Python ML Backend
```bash
cd ml-service
pip install -r requirements.txt
python app/main.py
```
