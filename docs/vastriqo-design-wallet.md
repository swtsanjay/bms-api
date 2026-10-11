# Vastriqo designs and wallet

Run the two additive migrations `20261007100000_vsq_design_rewards` and `20261007110000_vsq_wallet_codes` after building `bms-api`. They extend the `vsq_*` commerce schema. The older BMS wallet tables are not used.

For databases where those migrations already ran, run the new `20261008100000_vsq_per_design_rewards` migration after building the updated API. It stores the amount staff select for each newly approved design, permits multiple rewards per customer while retaining the unique submission constraint, and adds a private thumbnail key. Existing rewards, transactions and balances are left intact. Earlier approvals without a recorded amount are not credited retroactively.

## Required configuration

- `AWS_S3_PRIVATE_DESIGN_BUCKET_NAME`: a separate S3 bucket with public access blocked. It must differ from `AWS_S3_BUCKET_NAME`. Allow the API role to put, get and delete objects. Staff and the owning customer receive five-minute signed inline preview URLs after authorization. Image thumbnails are generated on first access and cached privately in the same bucket.
- `VSQ_GIFT_CODE_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters. Keep it stable; changing it makes previously purchased codes unreadable to buyers and the email worker.
- Existing Razorpay settings must be enabled for gift-code purchases. The existing signed webhook endpoint must receive `payment.captured`, `order.paid` and refund events. The buyer callback also verifies a captured payment against Razorpay before issuing a code.
- Existing Mailgun settings must be enabled to deliver verification, reward and purchased-code emails from the commerce outbox.
- Set `VITE_API_BASE_URL=http://localhost:4000/` for local `bms-admin`; otherwise it uses its existing remote default.

Codes and credits do not expire. Unredeemed gift codes can be voided and refunded through the commerce admin wallet. Redeemed codes require manual financial review; the automatic refund action refuses them. The encryption key and private bucket policy are launch dependencies.
New package and purchased gift codes use `VAS-` followed by 12 uppercase letters or digits (excluding easily confused `I`, `O`, `0` and `1`). Previously issued `VSQ-` plus 32 hexadecimal character codes remain redeemable. The wallet accepts either prefix with or without its separator hyphen; no database migration or code reissue is needed.

New package codes are also encrypted with `VSQ_GIFT_CODE_ENCRYPTION_KEY` so an authenticated commerce admin can reveal a code in the Package codes tab or download its two-sided A6 card. The card keeps the supplied photo-free artwork and inserts the code and stored credit value; its QR opens `/wallet`. Reveals and card downloads create audit entries without the plaintext. Package codes issued before this change only have hashes and cannot be recovered from the database; use their original CSV export. Keep the encryption key stable so new package and purchased gift codes remain readable.
If a provider refund fails after a refund ID has been issued, the code remains void and the purchase stays pending for staff reconciliation. The system does not automatically make that code redeemable again.

## Local verification

From `bms-api`, run `npm run build` and `node --test tests/wallet-design.integration.js`. The test script requires a local MySQL server and permission to create and drop a disposable schema. It queues email rows only and stubs Razorpay calls; it does not send mail or charge a payment method.
