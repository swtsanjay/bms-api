# Vastriqo designs and wallet

Run the two additive migrations `20261007100000_vsq_design_rewards` and `20261007110000_vsq_wallet_codes` after building `bms-api`. They extend the `vsq_*` commerce schema. The older BMS wallet tables are not used.

## Required configuration

- `AWS_S3_PRIVATE_DESIGN_BUCKET_NAME`: a separate S3 bucket with public access blocked. It must differ from `AWS_S3_BUCKET_NAME`. Allow the API role to put, get and delete objects. Staff get a five-minute signed download URL.
- `VSQ_GIFT_CODE_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters. Keep it stable; changing it makes previously purchased codes unreadable to buyers and the email worker.
- Existing Razorpay settings must be enabled for gift-code purchases. The existing signed webhook endpoint must receive `payment.captured`, `order.paid` and refund events. The buyer callback also verifies a captured payment against Razorpay before issuing a code.
- Existing Mailgun settings must be enabled to deliver verification, reward and purchased-code emails from the commerce outbox.
- Set `VITE_API_BASE_URL=http://localhost:4000/` for local `bms-admin`; otherwise it uses its existing remote default.

Codes and credits do not expire. Unredeemed gift codes can be voided and refunded through the commerce admin wallet. Redeemed codes require manual financial review; the automatic refund action refuses them. The encryption key and private bucket policy are launch dependencies.
If a provider refund fails after a refund ID has been issued, the code remains void and the purchase stays pending for staff reconciliation. The system does not automatically make that code redeemable again.

## Local verification

From `bms-api`, run `npm run build` and `node --test tests/wallet-design.integration.js`. The test script requires a local MySQL server and permission to create and drop a disposable schema. It queues email rows only and stubs Razorpay calls; it does not send mail or charge a payment method.
