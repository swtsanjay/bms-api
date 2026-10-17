# Vastriqo clean-launch reset

`20261017160000_vsq_clean_launch` is a **one-time, irreversible data migration**. The API's `main` deployment runs migrations against the AWS-configured database automatically. Take and verify a restorable database backup **before pushing this migration to `main`**. Do not apply it to a database whose older orders still need tracking, fulfilment, refunds, or accounting records.

The deployment stops its managed EC2 API container before running migrations, and restarts that container if a migration fails. This causes a short API interruption. If any other API instance or worker can write commerce data, pause it for the reset too. The migration performs its data changes in one database transaction.

## Removed or reset

- All Vastriqo commerce orders and their items, addresses, status history, discounts, payments, refunds, returns, shipments, shipment events, and linked inquiry order references. Inquiries themselves remain.
- Old carts, checkout sessions, shipping quotes, inventory reservations, order-linked inventory movements, and reserved stock. **On-hand stock stays at its current value.**
- All Vastriqo credit transactions and redemptions, customer credit balances, referral claims and order attribution. Customer referral codes remain, but default attribution is cleared.
- Gift purchases, wallet/package codes, design submissions and rewards, and their review events. Gift denomination settings remain.
- Product reviews tied to the deleted order items and their database-linked media; coupon usage counts (coupon definitions remain); order/credit/gift/design emails, commerce payment webhook events, old order outbox events, and commerce idempotency records. Customer welcome, verification, and password emails remain.

Customer accounts, login credentials, saved addresses, product catalog, current on-hand stock, store configuration, and separate BMS `orders`/invoices remain. The migration does not delete uploaded files in object storage or alter external Shiprocket/Razorpay records. Deleting local gift/payment records does not issue a provider refund.

After the deployment, verify `vsq_orders`, `vsq_shipments`, `vsq_payment_attempts`, `vsq_credit_transactions`, `vsq_gift_purchases`, and `vsq_design_submissions` each have zero rows. Check that `vsq_credit_accounts` has zero pending and available balances, `vsq_inventory_levels.reserved` is zero while `on_hand` retains its previous values, and `vsq_customers` and BMS `orders` retain their pre-deployment counts. A migration rollback cannot restore deleted data; use the pre-deployment backup if recovery is needed.
