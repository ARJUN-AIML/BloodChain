# BloodChain AI — Brevo Transactional Email Integration Guide

> **CRITICAL ARCHITECTURAL BOUNDARY**  
> Brevo is strictly an external, **notification-only** delivery service for emergency transactional emails.  
> **Django remains the sole authoritative system** for all user authentication, role-based access permissions, blood inventory quantities, transfer requests, clinical approvals, transport dispatch, delivery confirmation, and audit logs.  
> Email delivery responses never alter transfer statuses, inventory quantities, or clinical workflows.

---

## 1. Prerequisites & Required Environment Variables

Configure these variables in your local `.env` file (copied from `.env.example`):

```bash
# Brevo Transactional Email API (Direct HTTPS Integration)
# Keep BREVO_INTEGRATION_ENABLED=false for local development / test simulation mode
BREVO_API_KEY=your-actual-brevo-api-key
BREVO_SENDER_EMAIL=notifications@bloodchain.ai
BREVO_SENDER_NAME=BloodChain AI Emergency Notifications
BREVO_INTEGRATION_ENABLED=false
```

- **`BREVO_API_KEY`**: Your Brevo API v3 key (obtained from Brevo Dashboard -> SMTP & API -> API Keys).
- **`BREVO_SENDER_EMAIL`**: The verified sender email address registered in your Brevo account (e.g. `notifications@bloodchain.ai`).
- **`BREVO_SENDER_NAME`**: Sender display name shown to recipients (e.g. `BloodChain AI Emergency Notifications`).
- **`BREVO_INTEGRATION_ENABLED`**: Boolean flag (`false` by default). When `false`, the outbox engine logs simulated emails locally without making external network calls. Set to `true` only when you are ready to send live transactional emails.

---

## 2. Brevo API Specification

- **Endpoint**: `POST https://api.brevo.com/v3/smtp/email`
- **Authentication**: `api-key: <BREVO_API_KEY>` HTTP header
- **Content-Type**: `application/json`
- **Payload Schema**:
  ```json
  {
    "sender": {
      "name": "BloodChain AI Emergency Notifications",
      "email": "notifications@bloodchain.ai"
    },
    "to": [
      {
        "email": "hospital.staff@bloodchain.local",
        "name": "Trichy GH Ward A"
      }
    ],
    "subject": "[BloodChain AI Demo] Transfer approved",
    "htmlContent": "<!DOCTYPE html><html>...</html>",
    "textContent": "Transfer approved\n\nBlood transfer of 5 units O+ RBC has been approved.",
    "tags": ["bloodchain-demo", "transfer_approved"],
    "headers": {
      "X-BloodChain-Notification-Id": "bc-notif-transfer_approved-TR_12345",
      "X-BloodChain-Event-Type": "transfer_approved"
    }
  }
  ```

---

## 3. Delivery Semantics & Outbox Architecture

1. **Submission vs. Delivery**:  
   When Brevo responds with HTTP 201 Created (or 200 OK), the record status is marked as **`submitted`** (accepted into Brevo's queue). It is **not** marked as delivered or opened.
2. **Message ID Tracking**:  
   Brevo's unique `messageId` (e.g. `<202609211234.123456789@smtp-relay.mailin.fr>`) is extracted from the API response and stored in `NotificationDelivery.provider_message_id`.
3. **Two-Stage Outbox Timing**:
   - **Stage 1 (Inside Transaction)**: `NotificationDelivery` is created in PostgreSQL with status `pending`. If the transaction rolls back, the notification rolls back with it.
   - **Stage 2 (`transaction.on_commit`)**: External dispatch executes only after successful database commit.
4. **Crash Recovery**:  
   If the application crashes after commit but before network dispatch, the pending record remains in PostgreSQL. Run:
   ```bash
   python manage.py retry_pending_notifications
   ```

---

## 4. Testing & Verification

### A. Simulated Mode (Default: `BREVO_INTEGRATION_ENABLED=false`)
- Zero outbound network traffic.
- Emails are formatted, validated, and logged to console with status `demonstration_sent`.

### B. Live Email Testing (`BREVO_INTEGRATION_ENABLED=true`)
To send a real test email via your Brevo account:
1. Ensure your sender email is verified in Brevo.
2. Set `BREVO_INTEGRATION_ENABLED=true` and your valid `BREVO_API_KEY` in `.env`.
3. Trigger a test dispatch from an authorized role:
   ```bash
   curl -X POST http://localhost:8000/api/notifications/test/ \
     -H "Content-Type: application/json" \
     -H "X-User-Role: ADMIN" \
     -d '{"recipient_email": "your-personal-email@example.com"}'
   ```
4. Query notification status:
   ```bash
   curl http://localhost:8000/api/notifications/status/bc-notif-test-<id>/
   ```
