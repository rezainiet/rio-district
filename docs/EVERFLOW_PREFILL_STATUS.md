# Everflow customer prefill status

The checkout form submits the customer's entered name, email, phone and delivery address to
`POST /api/orders`. The server validates the input, stores an unpaid order, then builds the
selected offer's redirect URL from the configured tracking link. `buildEverflowUrl` attaches
these values on the **first** request to the tracking link with `URLSearchParams`:

| Form value | Tracking parameter |
| --- | --- |
| First name | `sub10` |
| Last name | `adv3` |
| Postal code | `sub3` |
| Email | `sub4` |
| City | `sub6` |
| Street address and optional address complement | `sub7` |
| Phone | `sub8` |

The configured single and duo links, offer prices, product metadata parameters and approved
tracking identifiers remain separate. No customer URL or query string is written to the
application log. The checkout form tells customers before submission that their details go
to the external partner in a URL. Partner-side authorization must be confirmed by the owner.

Synthetic tests verify both offer paths, all seven values, special-character encoding and
tracking parameter retention. A direct synthetic request to each configured tracking link
returned a 302 whose destination contained the seven corresponding fields (`first`, `last`,
`zip`, `email`, `city`, `address`, `phone`). This establishes forwarding through the tracker;
it does **not** establish that the destination renders a prefilled first page. The provider's
page returns HTTP 403 from the VPS and redirected to Google in the testing browser. The
client's screenshot shows the first provider page with empty customer fields. The provider
must verify that its landing page consumes those forwarded fields and fills its first form.
Do not send real customer details in diagnostic links or logs.

The live duo requires separately approved bundle metadata and image. Until supplied,
`EVERFLOW_BUNDLE_METADATA_APPROVED=false` and `EVERFLOW_BUNDLE_IMAGE_URL` remains empty;
the app refuses a final live duo redirect. Test-only approval values in unit tests do not
authorize production activation of that gate.
