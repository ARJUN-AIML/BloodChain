# 🩸 BloodChain AI — Simple Operational Guide & User Manual

> **System Note**: BloodChain AI is a development prototype and demonstration benchmark. All hospital names, inventory numbers, and scenarios are synthetic demonstration data.

---

## 1. What is BloodChain AI?

**BloodChain AI** is a regional blood supply coordination platform. It solves two critical problems:
1. **Emergency Shortages**: Hospitals running out of blood during trauma influxes.
2. **Preventable Wastage**: Blood expiring on hospital shelves because newer stock was used first.

It connects **hospitals**, **central blood banks**, **approving medical officers**, and **courier couriers** into one system to coordinate blood requests, clinical approvals, batch-level cold transport, and audit tracking.

---

## 2. Who Uses BloodChain AI? (The 5 Roles)

Every role has a strict job and cannot perform actions reserved for other roles:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────────┐
│ Role & Persona          │ Where they work         │ What they can & cannot do   │
├─────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ 1. HOSPITAL STAFF       │ Emergency Trauma Wards  │ ✅ Request emergency blood   │
│    (Dr. Rajesh Kumar)   │ & Surgery Theaters      │ ✅ Record patient ward usage │
│                         │                         │ ❌ CANNOT approve transfers │
├─────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ 2. AUTHORIZED APPROVER  │ Regional Transfusion    │ ✅ Approve transfer requests│
│    (Dr. Sarah Jenkins)  │ Medical Council         │ ✅ Reject with mandatory reason│
│                         │                         │ ❌ CANNOT request blood     │
├─────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ 3. BLOOD BANK STAFF     │ Central Blood Centers   │ ✅ Inspect FEFO picklists   │
│    (Ananya Roy)         │ & Storage Hubs          │ ✅ Manage testing & batches │
│                         │                         │ ❌ CANNOT approve requests  │
├─────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ 4. LOGISTICS COURIER    │ Kaveri Cold-Chain       │ ✅ Start transport (dispatch)│
│    (Vikram Sethi)       │ Transport Fleet         │ ✅ Confirm delivery receipt │
│                         │                         │ ❌ CANNOT approve transfers │
├─────────────────────────┼─────────────────────────┼─────────────────────────────┤
│ 5. ADMINISTRATOR        │ System Operations       │ ✅ Manage facility directory│
│    (R. Administrator)   │ & Regional Audit        │ ✅ Review immutable audits  │
│                         │                         │ ❌ CANNOT bypass approver   │
└─────────────────────────┴─────────────────────────┴─────────────────────────────┘
```

---

## 3. The Emergency Story: Step-by-Step

To see how BloodChain AI works in real life, follow this emergency highway trauma scenario:

### The Problem
* At 02:15 AM, two highway accident victims arrive at **Manapparai Trauma Unit**.
* The surgeon needs **4 units of O-Negative blood** immediately.
* Manapparai has only 1 unit in stock, already reserved for an ICU patient (**0 usable units**).

---

### Step 1: Hospital Requests Blood
* **Who**: Dr. Rajesh Kumar (`HOSPITAL_STAFF`).
* **Where**: Screen: **Request Blood** (`/requests`).
* **Action**: Clicks **+ Request Emergency Blood**, selects `O_NEGATIVE`, quantity `4`, priority `EMERGENCY`.
* **Result**: Transfer created with status **Waiting for approval** (`PENDING_APPROVAL`).

---

### Step 2: System Checks "Safe-to-Share"
* **Who**: BloodChain AI platform (automatic).
* **Rule**: A donor hospital is **never** asked to give blood if doing so risks its own patients.
* **Calculation**:
  $$\text{Safe-to-Share} = \text{Available} - \text{Reserved} - \text{Safety Buffer}$$
* **Result**: **Tiruchirappalli Central Hub** has 20 units total. After protecting its own safety buffer, it has **14 Safe-to-Share units**. The system recommends it as the donor.

---

### Step 3: Medical Officer Approves
* **Who**: Dr. Sarah Jenkins (`AUTHORIZED_APPROVER`).
* **Where**: Screen: **Approvals Queue** (`/command-center`).
* **Action**: Dr. Sarah reviews the trauma urgency and the donor hub's safety margin, then clicks **Approve Transfer**.
* **Result**: Status changes to **Approved for dispatch** (`APPROVED`). An email alert is staged for dispatch.
* *(Alternative)*: If Dr. Sarah clicks **Reject**, she **must** enter a clinical reason (e.g., *"Alternative B+ blood available locally"*). Leaving the reason blank is blocked.

---

### Step 4: Blood Bank Packs the Soonest-Expiring Batch (FEFO)
* **Who**: Ananya Roy (`BLOOD_BANK_STAFF`).
* **Where**: Screen: **Batches & Stock** (`/inventory`).
* **Rule**: **FEFO (First Expiry, First Out)**. Always use blood that expires soonest.
* **Action**: The system generates a picklist:
  * `Batch A` (expires in 5 days): **Pick 2 units** (depleted first!).
  * `Batch B` (expires in 25 days): **Pick 2 units**.
* **Result**: Zero wastage. The cooler box is packed and sealed for the courier.

---

### Step 5: Logistics Courier Dispatches
* **Who**: Vikram Sethi (`LOGISTICS_STAFF`).
* **Where**: Screen: **Cold Transport** (`/logistics`).
* **Action**: Vikram collects the box and clicks **Start Transport**.
* **Result**: 
  * Status changes to **Being transported** (`IN_TRANSIT`).
  * Central Hub's available stock **immediately drops from 20 to 16 units**.

---

### Step 6: Destination Receives the Blood
* **Who**: Vikram Sethi (`LOGISTICS_STAFF`) hands over to Dr. Rajesh.
* **Where**: Screen: **Active Shipments** (`/requests`).
* **Action**: Clicks **Confirm Delivery**.
* **Result**:
  * Status changes to **Received by destination** (`RECEIVED`).
  * Manapparai Trauma Unit's stock **immediately increases from 1 to 5 units**.
  * The patient receives the transfusion in surgery.

---

### Step 7: Inventory Reconciled & Audited
* **Conservation Check**: Total blood units across both hospitals before transfer ($20 + 1 = 21$). Total units after transfer ($16 + 5 = 21$). **Zero phantom units created or lost.**
* **Audit History**: Screen: **Audit History** (`/audit-logs`). An unchangeable log records:
  1. `TRANSFER_CREATED` by Dr. Rajesh Kumar.
  2. `TRANSFER_APPROVED` by Dr. Sarah Jenkins.
  3. `TRANSFER_DISPATCHED` by Vikram Sethi.
  4. `TRANSFER_RECEIVED` by Vikram Sethi.

---

## 4. The 5 Transfer Statuses

BloodChain AI moves every request through a strict sequence:

```
[Request Submitted]
        │
        ▼
1. PENDING_APPROVAL  ──► (Waiting for medical approver review)
        │
        ├──► REJECTED  ──► (Request denied with clinical reason; ends here)
        │
        ▼
2. APPROVED          ──► (Approved by doctor; waiting for courier)
        │
        ▼
3. IN_TRANSIT        ──► (Courier on the road; donor stock deducted)
        │
        ▼
4. RECEIVED          ──► (Delivered at hospital; destination stock credited)
```

* 🚫 **Cannot skip steps**: A courier cannot dispatch blood before an approver signs off.
* 🚫 **Cannot double-credit**: Clicking "Confirm Delivery" twice will not add extra blood.

---

## 5. Key Safety Rules

### 1. Safe-to-Share Guardrail
A hospital will **never** be stripped of blood needed for its own local emergencies. If a hospital needs 6 units for safety, those 6 units are locked and cannot be transferred away.

### 2. FEFO (First Expiry, First Out)
The algorithm automatically selects blood bags that will expire earliest so they are used first. Newer blood remains in storage.

### 3. Separation of Duties (No Self-Approval)
* A doctor requesting blood **cannot** approve their own request.
* A courier **cannot** change blood amounts or approve requests.
* An administrator **cannot** bypass doctors to approve transfers.

### 4. Zero Patient Privacy Risks (No PHI)
Email notifications and audit logs contain **only logistical information** (Hospital names, blood type, quantity, urgency). Patient names, bed numbers, and medical conditions are never sent in emails or exposed.

---

## 6. How the AI Prediction & Solver Work

* **Demand Forecasting**: Uses an `XGBoost` model trained on synthetic historical blood usage to forecast how many units each hospital will need over the next 24 hours.
* **Shortage Detection**: If projected usage exceeds current usable stock, the system raises an alert (`CRITICAL` or `WARNING`).
* **Route & Allocation Solver**:
  * In the full design, Google OR-Tools calculates optimal multi-hospital routes.
  * In this local prototype, OR-Tools is uninstalled, so the system uses a built-in **Greedy Heuristic Fallback** (prioritizing lowest risk and shortest travel time).
  * *Note*: While the API response shows `OPTIMAL`, mathematical global optimality is a future enhancement when OR-Tools is installed.

---

## 7. Email Notifications: "Submitted" vs "Delivered"

BloodChain AI uses Brevo Transactional Email to alert staff:
* **`submitted`**: Brevo accepted the email into its delivery queue. (This happens immediately).
* **`delivered`**: An authenticated webhook confirms the email reached the inbox.
* *Prototype Note*: In local testing without a public web address, emails are marked `submitted`. The system never pretends an email was delivered without proof.

---

## 8. Common Troubleshooting

| Issue / Error | Why it happened | What to do |
| :--- | :--- | :--- |
| **"Unauthorized Role" (403)** | You tried to do an action not allowed for your role (e.g. Hospital Staff trying to approve). | Switch to the correct role using the top-right menu (e.g. Authorized Approver). |
| **"Duplicate Transfer Request" (400)** | A transfer for the same hospital and blood type is already active. | Wait for the active shipment to finish before requesting another. |
| **"Reason Mandatory" (400)** | You clicked Reject but left the explanation blank. | Type a clinical reason (e.g. *"Alternative stock available"*) and confirm. |
| **"Exceeds Safe-Share" (400)** | The donor hospital would be left with dangerously low stock. | Request a smaller quantity or pick another donor facility. |

---

## 9. Quick Cheat-Sheet for New Users

```
Need to request blood?        ──► Switch to HOSPITAL STAFF ──► Go to /requests ──► Click "+ Request Blood"
Need to approve a request?    ──► Switch to AUTHORIZED APPROVER ──► Go to /command-center ──► Click "Approve"
Need to pick blood bags?       ──► Switch to BLOOD BANK STAFF ──► Go to /inventory ──► Check FEFO Picklist
Need to start courier trip?   ──► Switch to LOGISTICS STAFF ──► Go to /logistics ──► Click "Start Transport"
Need to confirm arrival?      ──► Switch to LOGISTICS STAFF ──► Go to /requests ──► Click "Confirm Delivery"
Need to record surgery usage? ──► Switch to HOSPITAL STAFF ──► Go to /inventory ──► Click "Record Ward Usage"
Need to inspect audit trail?  ──► Switch to ADMINISTRATOR ──► Go to /audit-logs
```

---

## 10. Prototype Limitations

1. **Synthetic Data**: All facilities, batches, and patient transfers are demo simulations.
2. **No EHR Integration**: BloodChain AI does not pull directly from live hospital record systems.
3. **Medical Supervision Required**: BloodChain AI does not perform physical laboratory cross-matching or replace clinical medical judgment.
