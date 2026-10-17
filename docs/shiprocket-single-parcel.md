# Shiprocket single-parcel setup

The commerce workflow creates **one Shiprocket Custom order and one shipment per accepted Vastriqo order**. It does not import website orders from sales channels. The account's disconnected channel need not be connected; the Custom Order API omits `channel_id` and uses the account's default Custom channel. Other courier remains a separate, manually entered option for paid orders only.

## Account and server setup

1. In the Shiprocket seller account, add a dedicated API user under **Settings → API → Configure → Create API User**. Give it only the permissions required for orders, couriers, pickup, labels and tracking. Use its email and password as server-only secrets. Do not use seller login credentials in a browser or commit either value.
2. Confirm the desired pickup address exists, is active, and has a verified six-digit pincode. The admin form lists pickup locations from Shiprocket; it never creates a pickup address.
3. Set these in the BMS API runtime's secret manager or untracked environment file:

   ```text
   SHIPROCKET_API_EMAIL=<dedicated API user email>
   SHIPROCKET_API_PASSWORD=<dedicated API user password>
   SHIPROCKET_WEBHOOK_TOKEN=<separate high-entropy random secret>
   ```

4. Review the pending migrations for the target database, back it up, and run the API migration `20261016100000_shiprocket_single_parcel` before starting the updated API. Deploy API, then admin, then storefront. The migration adds nullable integration fields and retains older manually entered Shiprocket records.
5. Expose `POST https://<API host>/webhooks/v1/parcel-status` over HTTPS to Shiprocket. Ensure the reverse proxy forwards `x-api-key`, accepts JSON, and reaches BMS API without staff or customer JWT middleware. Restrict request size at the proxy. In **Shiprocket Settings → API → Webhooks**, configure this URL and the same secret as its token. Shiprocket sends it in `x-api-key`. Its webhook documentation says the URL must not contain `shiprocket`, `kartrocket`, `sr`, or `kr`; the path above avoids them. Keep any domain name compliant too.
6. Confirm in a safe, controlled environment that the API user can read pickups and rates, and that a provider webhook reaches the endpoint with a 200 response. Only then enable staff booking. No live order booking is needed as a deployment smoke test.

The API uses `POST /v1/external/orders/create/adhoc`, not the channel-specific create endpoint. The merchant reference is a stable decimal representation of the local shipment UUID, at most 39 digits (the Custom API permits 50 characters). The local shipment row is saved before the external create call. The server holds the API bearer token in memory; no Shiprocket credentials or bearer token enter the admin or storefront responses.

For COD orders partly paid with Vastriqo Credits, the server sends the recorded credits as Shiprocket's documented `partial_cod_collected` amount. The remaining COD balance stays equal to this order's server-calculated amount due. Fully credit-paid orders go as prepaid. Staff should verify the resulting COD amount in the Shiprocket account before handing over the first real parcel.

## Staff workflow and recovery

After **Accepted**, staff choose a listed pickup, enter measured parcel weight in kilograms and length/breadth/height in centimetres, request serviceability, choose a rate, and explicitly book. Booking creates the external order, assigns the chosen courier and AWB, requests pickup, and generates a label. **Booked**, **AWB assigned**, **pickup scheduled**, and **label ready** are preparation milestones. Only a verified provider pickup/handover or later tracking event changes the order to Shipped. Staff can use **Refresh tracking** if a webhook was missed and **Reconcile booking** after an uncertain API response.

If the API times out after an external mutation, the local parcel enters `RECONCILE_REQUIRED` and blocks another booking call. Reconcile searches Shiprocket by the exact merchant reference or reads its known order ID. Once the next step is proven untouched, **Continue booking** advances the same external shipment. An attempted AWB or pickup with no definitive provider result stays uncertain and cannot be repeated automatically. If Shiprocket still does not show a matching order, check the account manually and contact Shiprocket support before any new attempt. Never edit the reference or create a second parcel to work around an uncertain result. An older `SHIPROCKET_MANUAL` parcel with an AWB stays manual and cannot be booked automatically. A prepared manual Shiprocket parcel without an AWB can be converted by explicitly booking it.

Before courier handover, a booked parcel must be cancelled in Shiprocket and verified cancelled before the existing local order cancellation releases inventory or queues a refund. If Shiprocket has collected it, record a cancellation/interception request and use the return workflow when appropriate. A customer cancellation request on a booked parcel records review without restocking or claiming a refund is complete. The authorized staff label endpoint is `GET /admin/v1/commerce/orders/:publicId/shiprocket/label`; customer order responses do not contain the label URL.

API sources: [Shiprocket Custom Order and courier APIs](https://apidocs.shiprocket.in/?version=latest), [order lifecycle](https://apidocs-test.shiprocket.in/guides/order-lifecycle/), [tracking webhooks](https://apidocs-test.shiprocket.in/guides/webhooks/), [pickup address API changes](https://apidocs-test.shiprocket.in/releases/2026-10/).
