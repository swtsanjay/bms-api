# Commerce product reviews

## Scope and database plan

Reviews use `vsq_product_reviews`, `vsq_product_review_media` and `vsq_product_review_uploads`. No existing product, customer or order table is altered. There are no seeded reviews or fabricated ratings.

The media table stores each review's image/video kind, S3 object key, public URL, MIME type, byte size and display position. Its review foreign key cascades on hard deletion. Image/video bytes live in the configured S3 bucket, not in MySQL. Media is returned publicly only when its verified review is `PUBLISHED`; owners and admins can see pending media for moderation.

The upload table records short-lived, customer/product-bound S3 upload grants. Each grant can be consumed once when creating the review. Its `expires_at` and `consumed_at` fields prevent stale or reused attachments.

| Fields | Purpose |
| --- | --- |
| `id`, `public_id` | Internal primary key and UUID used in APIs |
| `product_id`, `customer_id` | Foreign keys to `vsq_products` and `vsq_customers`; unique together |
| `rating`, `title`, `body` | Integer rating 1–5, optional title up to 120 characters, plain-text review of 10–2,000 characters |
| `reviewer_name` | Snapshot of first name and last initial; no email or phone is published |
| `order_item_id`, `verified_purchase` | Required order evidence at submission and server-computed verification snapshot; FK may become null after order-item deletion |
| `status` | `PENDING`, `PUBLISHED`, or `REJECTED` |
| `moderated_by`, `moderated_at`, `moderation_note` | Private moderation details; administrator IDs follow the existing audit-log convention |
| `version` | Optimistic concurrency control for moderation |
| `created_at`, `updated_at`, `published_at` | Submission and moderation/publication times |

Indexes support public product reviews, moderation queues and customer submission-rate checks. The database enforces one review per customer/product and rating bounds (on MySQL versions that enforce CHECK constraints). Application validation also enforces rating bounds.

Moderation changes append to the **existing** `vsq_commerce_audit_logs` in the same transaction. Public ratings are calculated from verified `PUBLISHED` rows rather than stored on products, so rejecting a published review automatically removes it from the average and count. Legacy unverified reviews are retained privately, excluded from public counts/listings and cannot be published by an administrator.

Hard deletion of a customer or product cascades to its reviews; normal product soft-deletion retains reviews but prevents public access. Removing an order item sets the optional evidence FK to null and retains the verification snapshot. No deletion or rollback was performed as part of implementation.

## Policy

- Only active signed-in verified buyers can submit one review per active, published product. The server checks purchase eligibility again on every submission; non-buyers receive HTTP 403 even if they bypass the UI or forge verification/order fields.
- All submissions start `PENDING`. Only verified `PUBLISHED` reviews and their aggregate counts are public.
- Verified purchase requires a matching product variant in the authenticated customer's non-cancelled order, with `paid_at` recorded and financial status `PAID`, `PARTIALLY_REFUNDED` or `REFUNDED`. Refunded buyers can still have genuine experiences to review. Unpaid COD orders do not qualify yet.
- The customer ID comes from authentication. Status, reviewer name, order evidence and verification flags cannot be supplied by the customer.
- Five submissions per hour per customer; a customer-row transaction lock serializes rate-limit and duplicate checks. The unique constraint is an additional race-safety guard.
- Public responses omit customer/order IDs, contact information and moderation notes. Private and public review endpoints send `Cache-Control: no-store`.
- Publish genuine positive **and negative** feedback. Reject spam, abuse, unrelated content or exposed personal information—not criticism or low ratings.

## Storefront/API routes

Browser traffic uses Vastriqo's same-origin wrapper, `/api/commerce/reviews/...`; the backend origin and authentication tokens remain server-side.

| Method and backend path | Access | Behaviour |
| --- | --- | --- |
| `GET /front/v1/commerce/reviews/products/:productUUID` | Public | Verified published reviews, rating distribution/average, pagination |
| `GET /front/v1/commerce/reviews/products/:productUUID/mine` | Customer | Own review/status, `can_review`, and `reason` (`ALREADY_REVIEWED`, `VERIFIED_PURCHASE_REQUIRED`, or null) |
| `POST /front/v1/commerce/reviews/products/:productUUID/uploads` | Verified buyer | Authorize one image or video upload after checking the paid order; returns a short-lived S3 presigned POST |
| `POST /front/v1/commerce/reviews/products/:productUUID` | Verified buyer | Submit pending review as JSON with optional `upload_ids` (up to 3 images and 1 video); no qualifying purchase returns 403; duplicate returns 409 |
| `GET /admin/v1/commerce/reviews` | BMS administrator | Paginated moderation list |
| `PATCH /admin/v1/commerce/reviews/:reviewUUID` | BMS administrator | Moderate with current version; stale version returns 409 |

Public query parameters: `page` (1–10,000), `limit` (1–20, default 5), `sort` (`newest`, `highest`, `lowest`), optional `rating` (1–5). The summary always covers all verified published ratings for the product, even when filtering the review list. Tie-breaking by timestamp and ID keeps ordering deterministic.

Admin query parameters: `page`, `limit` (1–100, default 20), optional `status` and `product_public_id`.

Submission body:

```json
{
  "rating": 4,
  "title": "Comfortable everyday shirt",
  "body": "The fabric feels comfortable and the sizing worked well for me."
}
```

For each attachment, the browser sends `{ "kind": "IMAGE" | "VIDEO", "mime_type": "...", "byte_size": 123 }` to the same-origin Vastriqo wrapper. The BMS API verifies the signed-in customer has a paid, non-cancelled order for the product **before** creating a grant. A grant is valid for 10 minutes, binds an exact S3 key/content type/file size, and is rate-limited to 20 grants per customer per hour. The browser then sends a multipart POST **directly to S3**, with every returned policy field and the file as the final form field. The BMS API origin is never exposed to the browser. S3 bucket CORS must allow `POST` from the storefront origin.

Finally, the browser submits the review JSON with `upload_ids`. The API checks ownership, expiry, one-time use, S3 object size/type and actual file signature. Images (at most 3 MiB each) are read, stripped of metadata, resized to 1600×2000 maximum and stored as WebP. Video (at most 100 MiB; MP4, MOV or WebM) is checked via a small range request and copied within S3 to a final key; video bytes never pass through Vastriqo or BMS API. Only after successful verification does the database transaction create the pending review, media rows and mark grants consumed. Failed database writes delete newly created final S3 objects; successful writes delete staging objects. Abandoned staging objects need a bucket lifecycle rule for `commerce/review-staging/` (include `AWS_S3_UPLOAD_DIR_NAME` prefix if configured) that expires them after one day.

Moderation body (first fetch the current `version` from the admin list):

```json
{
  "status": "PUBLISHED",
  "version": 1,
  "note": "Checked against the review policy"
}
```

The moderation endpoint cannot rewrite a customer's rating or feedback. Reverting a review to `PENDING` or `REJECTED` removes it from public listings. Each change increments `version` and records an audit event.

## Rollout

The original review-media rollout needs the media and upload-grant migrations. The later admin-generated video thumbnail feature adds `20260922150000_vsq_review_video_thumbnails.ts`; it was applied to the local development database, but production still needs it.

1. Back up the target database and verify the intended environment/DB connection. This app defaults to `.env.dev` if `NODE_ENV` is omitted: do not rely on that default for migrations.
2. In `bms-api`, run `npm run build`.
3. Set `NODE_ENV` to the intended existing `.env.<environment>` and run `npm run migrate:latest`. Inspect **all pending migrations** first: this command runs more than just the review migrations if other files are pending. The review files are `20260922120000_vsq_product_reviews.ts`, `20260922130000_vsq_product_review_media.ts`, `20260922140000_vsq_product_review_uploads.ts` and `20260922150000_vsq_review_video_thumbnails.ts`.
4. Restart/deploy BMS API, then deploy Vastriqo. Existing review API requests will return an unavailable state until the backend and table are ready.
5. Smoke-test an empty product, authenticated submission, duplicate rejection, admin publication, public average/count, unpublication and authorization failures using dedicated test accounts/products.

Existing product-media S3 settings are required (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, and optional `AWS_S3_UPLOAD_DIR_NAME`). For production, set **`AWS_S3_REVIEW_STAGING_BUCKET_NAME` to a separate private S3 bucket in the same AWS region**; if omitted, staging falls back to the product-media bucket and may be publicly readable depending on that bucket's policy. The API identity needs `PutObject`, `GetObject` and `DeleteObject` on the staging bucket and `PutObject` on the final media bucket; replacing admin-generated thumbnails also needs `DeleteObject` on the final bucket. Configure staging-bucket CORS with the exact storefront origin, `POST` as the allowed method, and an S3 lifecycle rule for staging uploads. Deploy the API and run migrations before deploying the storefront. Do not run the `down` migrations casually: they drop review data but do not remove S3 objects.

Example S3 bucket CORS (replace the origins with the actual local and production Vastriqo origins):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-storefront.example"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## Implemented storefront

Linked average, fractional stars and review count directly below the product title share the review section's response (no duplicate summary request). Empty/error states never invent a rating. The lower section includes a rating breakdown, review list, sorting, rating filter, pagination, sign-in link, verified-buyer eligibility messaging, review form and moderation status. The form is available only after a successful server eligibility check. Purchase verification is enforced independently by POST.

The right-hand product panel retains the warm palette, with a clearer title/price hierarchy, quieter supporting text, consistent spacing, and responsive type sizes. No extra schema migration or environment setting is needed for verified-only enforcement if the original review migration is already applied.

Short product attribute values also use display-only capitalization. Highlighted attributes are omitted from the repeated specification rows below; stored product content is unchanged.

## Verification and limitations

```sh
npm run build
node --test tests/product-reviews.test.cjs
```

The tests exercise input validation, privacy serialization, aggregate calculations, actual Knex SQL generation/transaction flow with an in-memory transport, publication and ownership filters, duplicate/rate guards, optimistic moderation, audit writes, schema generation and route authorization. They never connect to or migrate a real database.

Vastriqo passes production build, TypeScript and targeted lint checks. Desktop/mobile public-review layouts and filtering were checked with temporary browser-only test responses, then cleared. Live authenticated submission and a real migration remain rollout checks.

V1 does **not** include customer edits/resubmissions, helpful votes, automated moderation, video transcoding, virus scanning or review-request emails. BMS Admin now has a moderation screen. Never place BMS admin tokens in the storefront. Configure S3 lifecycle/cleanup for orphaned review objects if reviews or customers are hard-deleted later; DB cascade does not delete S3 objects.

## Admin-generated video thumbnails

The video stays in S3. In E-Com → Reviews, an administrator selects **Generate thumbnail**; the browser captures the first decodable frame automatically. The JPEG is capped at 1 MiB and sent to the authenticated BMS API, which validates and normalizes it to WebP (at most 960 × 960), writes it to the final S3 bucket, and stores its key/URL on the `VIDEO` row of `vsq_product_review_media`. The API records an audit event and deletes the previous thumbnail after a successful replacement. The storefront loads the thumbnail first and attaches the video URL only after Play is clicked.

The current admin UI uses `POST /admin/v1/commerce/reviews/:reviewId/media/:mediaId/thumbnail-file` with a single multipart `file` field. The older presigned thumbnail endpoints remain for compatibility but are not used by this UI. The media ID appears only in admin review responses.

Bucket CORS must allow `GET` from the BMS Admin origin on the final media bucket so the browser can capture an S3 video frame onto canvas. The admin UI no longer needs S3 `POST` CORS for thumbnails. The storefront still needs S3 `POST` CORS on the staging bucket for direct customer media uploads.
