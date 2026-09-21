# Commerce product reviews

## Scope and database plan

One new table, `vsq_product_reviews`. No existing product, media, customer or order table is altered. There are no seeded reviews or fabricated ratings.

| Fields | Purpose |
| --- | --- |
| `id`, `public_id` | Internal primary key and UUID used in APIs |
| `product_id`, `customer_id` | Foreign keys to `vsq_products` and `vsq_customers`; unique together |
| `rating`, `title`, `body` | Integer rating 1–5, optional title up to 120 characters, plain-text review of 10–2,000 characters |
| `reviewer_name` | Snapshot of first name and last initial; no email or phone is published |
| `order_item_id`, `verified_purchase` | Optional order evidence and server-computed purchase-verification snapshot |
| `status` | `PENDING`, `PUBLISHED`, or `REJECTED` |
| `moderated_by`, `moderated_at`, `moderation_note` | Private moderation details; administrator IDs follow the existing audit-log convention |
| `version` | Optimistic concurrency control for moderation |
| `created_at`, `updated_at`, `published_at` | Submission and moderation/publication times |

Indexes support public product reviews, moderation queues and customer submission-rate checks. The database enforces one review per customer/product and rating bounds (on MySQL versions that enforce CHECK constraints). Application validation also enforces rating bounds.

Moderation changes append to the **existing** `vsq_commerce_audit_logs` in the same transaction. Public ratings are calculated from `PUBLISHED` rows rather than stored on products, so rejecting a published review automatically removes it from the average and count.

Hard deletion of a customer or product cascades to its reviews; normal product soft-deletion retains reviews but prevents public access. Removing an order item sets the optional evidence FK to null and retains the verification snapshot. No deletion or rollback was performed as part of implementation.

## Policy

- Any active signed-in customer can submit one review per active, published product. A purchase is not mandatory; non-purchasers do not receive a badge.
- All submissions start `PENDING`. Only `PUBLISHED` reviews and their aggregate counts are public.
- Verified purchase requires a matching product variant in the authenticated customer's non-cancelled order, with `paid_at` recorded and financial status `PAID`, `PARTIALLY_REFUNDED` or `REFUNDED`. Refunded buyers can still have genuine experiences to review. Unpaid COD orders do not qualify yet.
- The customer ID comes from authentication. Status, reviewer name, order evidence and verification flags cannot be supplied by the customer.
- Five submissions per hour per customer; a customer-row transaction lock serializes rate-limit and duplicate checks. The unique constraint is an additional race-safety guard.
- Public responses omit customer/order IDs, contact information and moderation notes. Private and public review endpoints send `Cache-Control: no-store`.
- Publish genuine positive **and negative** feedback. Reject spam, abuse, unrelated content or exposed personal information—not criticism or low ratings.

## Storefront/API routes

Browser traffic uses Vastriqo's same-origin wrapper, `/api/commerce/reviews/...`; the backend origin and authentication tokens remain server-side.

| Method and backend path | Access | Behaviour |
| --- | --- | --- |
| `GET /front/v1/commerce/reviews/products/:productUUID` | Public | Published reviews, rating distribution/average, pagination |
| `GET /front/v1/commerce/reviews/products/:productUUID/mine` | Customer | Only the authenticated customer's review and status |
| `POST /front/v1/commerce/reviews/products/:productUUID` | Customer | Submit pending review; duplicate returns 409 |
| `GET /admin/v1/commerce/reviews` | BMS administrator | Paginated moderation list |
| `PATCH /admin/v1/commerce/reviews/:reviewUUID` | BMS administrator | Moderate with current version; stale version returns 409 |

Public query parameters: `page` (1–10,000), `limit` (1–20, default 5), `sort` (`newest`, `highest`, `lowest`), optional `rating` (1–5). The summary always covers all published ratings for the product, even when filtering the review list. Tie-breaking by timestamp and ID keeps ordering deterministic.

Admin query parameters: `page`, `limit` (1–100, default 20), optional `status` and `product_public_id`.

Submission body:

```json
{
  "rating": 4,
  "title": "Comfortable everyday shirt",
  "body": "The fabric feels comfortable and the sizing worked well for me."
}
```

Moderation body (first fetch the current `version` from the admin list):

```json
{
  "status": "PUBLISHED",
  "version": 1,
  "note": "Checked against the review policy"
}
```

The moderation endpoint cannot rewrite a customer's rating or feedback. Reverting a review to `PENDING` or `REJECTED` removes it from public listings. Each change increments `version` and records an audit event.

## Rollout — migration has NOT been run

1. Back up the target database and verify the intended environment/DB connection. This app defaults to `.env.dev` if `NODE_ENV` is omitted: do not rely on that default for migrations.
2. In `bms-api`, run `npm run build`.
3. Set `NODE_ENV` to the intended existing `.env.<environment>` and run `npm run migrate:latest`. Inspect **all pending migrations** first: this command runs more than just the new migration if other files are pending. The new file is `20260922120000_vsq_product_reviews.ts`.
4. Restart/deploy BMS API, then deploy Vastriqo. Existing review API requests will return an unavailable state until the backend and table are ready.
5. Smoke-test an empty product, authenticated submission, duplicate rejection, admin publication, public average/count, unpublication and authorization failures using dedicated test accounts/products.

No additional environment variables are required. Do not run the `down` migration casually: it drops the review table and its data.

## Implemented storefront

Rating summary and breakdown, review list, newest/highest/lowest sorting, rating filter, pagination, sign-in link, review form, pending/published/rejected status messages, verified-purchase labels and honest loading/empty/error states. Fractional average stars are rendered without rounding up the visual rating.

Short product attribute values also use display-only capitalization. Highlighted attributes are omitted from the repeated specification rows below; stored product content is unchanged.

## Verification and limitations

```sh
npm run build
node --test tests/product-reviews.test.cjs
```

The tests exercise input validation, privacy serialization, aggregate calculations, actual Knex SQL generation/transaction flow with an in-memory transport, publication and ownership filters, duplicate/rate guards, optimistic moderation, audit writes, schema generation and route authorization. They never connect to or migrate a real database.

Vastriqo passes production build, TypeScript and targeted lint checks. Desktop/mobile public-review layouts and filtering were checked with temporary browser-only test responses, then cleared. Live authenticated submission and a real migration remain rollout checks.

V1 does **not** include a BMS moderation screen, customer edits/resubmissions, review photos, helpful votes, automated moderation or review-request emails. Administrators use the moderation APIs until a dedicated screen is added. Never place BMS admin tokens in the storefront.
