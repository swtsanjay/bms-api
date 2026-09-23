# Mailgun transactional email

## Required environment variables

Copy the values from `.env.mailgun.example` into the environment used by `bms-api`. For a Mailgun EU-region domain, use `https://api.eu.mailgun.net` as `MAILGUN_API_BASE_URL`.

Keep `MAILGUN_ENABLED=false` until the Mailgun sending domain has valid SPF and DKIM records. A Mailgun sandbox domain can send only to authorized recipients.

## Delivery model

- Application transactions enqueue messages in `vsq_email_outbox`.
- A background worker dispatches pending messages every 15 seconds.
- Failed deliveries retry with increasing delays and stop after five attempts.
- Unique event keys prevent duplicate welcome, order, or payment messages.
- Mailgun failures never roll back signup, checkout, or payment confirmation.

## Implemented messages

- Welcome after successful account creation
- Password-reset link, valid for 30 minutes and usable once
- Password-changed security confirmation
- Order-received confirmation for COD and online orders
- Payment confirmation after Razorpay capture or admin-confirmed COD/manual payment

Run the database migration before enabling email:

```sh
npm run build
npm run migrate:latest
```
