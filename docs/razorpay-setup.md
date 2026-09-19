# Razorpay production setup

The storefront never receives the Razorpay key secret, webhook secret, or the internal API URL. Configure these values only on the `bms-api` runtime:

```dotenv
RAZORPAY_ENABLED=true
RAZORPAY_KEY_ID=rzp_live_replace_me
RAZORPAY_KEY_SECRET=replace_me
RAZORPAY_WEBHOOK_SECRET=replace_with_a_separate_high_entropy_secret
RAZORPAY_RESERVATION_TTL_MINUTES=30
```

Before enabling payments:

1. Run the latest database migrations.
2. Set Razorpay payment capture to automatic in the Razorpay dashboard.
3. Register `https://vastriqo.com/api/webhooks/razorpay` as the webhook URL.
4. Subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, and `refund.failed`.
5. Use a webhook secret that is different from the API key secret.
6. Test the complete flow in Razorpay Test Mode, including duplicate webhook delivery, checkout dismissal, a failed payment, and a delayed capture.
7. Replace the test credentials with live credentials and perform a low-value live transaction before general release.

Keep `RAZORPAY_ENABLED=false` until the migration and all three credentials are present. The application fails fast on startup when Razorpay is enabled with incomplete credentials.
