# Restaurant Inventory — complete Google Apps Script app

This package contains the full server, mobile-friendly browser interface, manifest, import template, and verification guide. No subscription, paid API, external JavaScript library, hosting bill, or billing account is required. You supply a free Google account and its available Drive storage. Deployment into your account is the remaining setup step; this package is not an already deployed service.

## 1. Install (about 10–15 minutes)

1. Create a blank Google Sheet named **Restaurant Inventory** in the Google account that will own the app. Keep it private. Do not share the Sheet, script project, or receipt folder with staff.
2. In that Sheet choose **Extensions → Apps Script**.
3. Replace the default `Code.gs` with all of the supplied `Code.gs` content.
4. Click **+ → HTML**, name the file **Index**, and replace its contents with the entire supplied `Index.html`. The filename must be exactly `Index.html`.
5. In **Project Settings**, enable **Show appsscript.json manifest file in editor**. Replace its contents with the supplied `appsscript.json`. Change `America/Chicago` if your restaurant uses another timezone. Save all files.
6. In the editor's function selector choose **setup_**, then **Run**. Authorize Sheets and Drive access for your own project. A personal, unverified script may show Google's verification warning. Check that it is the project you just created before proceeding. Organization policies may prevent authorization or deployment; this app cannot bypass those policies.
7. Open the **Execution log** for this run. It displays three independently generated passwords: **owner**, **manager**, and **staff**. Save them privately in a password manager. Give the manager only the manager password; give employees only the common staff password. Never put these passwords in the Sheet or HTML.
8. Setup creates the **InventoryEvents** tab and a private Drive folder named **Inventory receipts - private**. Do not run setup again on this project.
9. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me**. For **Who has access**, use the most restrictive option that lets your employees open it. **Anyone with Google account**, when available, adds a Google sign-in gate. **Anyone** allows the custom app login without a Google account but exposes the login page publicly. Available choices depend on your account and administrator policy.
10. Deploy and copy the URL ending in **/exec**. Open it and sign in as **owner**. Share this URL and the appropriate account credentials. Do not share the editor URL or `/dev` test URL.
11. To install a code update later, save the files, choose **Deploy → Manage deployments → Edit → New version → Deploy**. The existing `/exec` URL continues to work. Do not rerun setup or create a second database.

The trailing underscores on `setup_` and `resetPasswords_` are intentional: they allow editor execution while preventing browser calls through `google.script.run`. Other helpers are also private. Do not remove their underscores.

## 2. Load your inventory

- Use **Catalog** to add individual SKUs. You can type supplier names freely or choose from suggestions: Restaurant Depot, Sam's, Costco, Browns, Produce, Online, and Third-party. Replace generic names with actual suppliers as desired.
- **All suppliers** uses a pipe separator, such as `Restaurant Depot|Costco|Browns`. The primary supplier is automatically included in the item's assignments.
- Pick one permanent stock unit for every SKU: `lb`, `gallon`, `each`, `case`, etc. Unit conversions are manual. For a 20-pound case costing $40, enter quantity **20** and unit price **2** if the stock unit is pounds. Use a different SKU if the stock unit changes.
- Set a **reorder target** in that same unit. When combined restaurant + garage stock is below this number, Shopping shows the amount needed to restore the target. It is both the threshold and the desired total in this version.
- Import hundreds or thousands of catalog items with **Import**. Use `catalog-template.csv` as the model. Header order is exact:

  `sku,name,unit,category,target,suppliers,primary`

- For an Excel `.xlsx` or `.xls` file, open it in Excel and **Save As → CSV UTF-8**, or import it into Google Sheets and **File → Download → Comma-separated values**. Then upload that CSV. Native Excel binaries are not parsed by this app. Export one worksheet at a time. This route needs no paid spreadsheet software when Google Sheets is used.
- Click **Validate and preview**, review the count and sample, then **Import all validated items**. Quoted commas and newlines in CSV fields are supported. Duplicate SKUs within a file are rejected. Existing SKU metadata is updated; quantities are preserved. A blank unit defaults to `each`.
- Imports commit in batches of 25. If interrupted, earlier batches remain saved. Retry the import button while the preview remains open, or import the same file again. Catalog upserts do not add stock, so retrying does not duplicate quantities. Do not have two administrators edit the same catalog concurrently; metadata uses the last committed update.
- New items start at zero. Use **Stock → Count / adjust** to enter opening restaurant and garage counts with reason `Opening count`. Opening counts are not purchases and do not affect monthly spend.

There is no coded maximum SKU count and no 500-item cap. The verification exercise loads 526 SKUs. Each import batch and each receipt has a size limit to stay within Apps Script/Sheets execution and cell limits; these are transaction limits, not catalog limits.

## 3. Everyday workflow

### Staff

1. Sign in as **staff**. Stock lists name, SKU, category search, unit, restaurant quantity, garage quantity, and total. Prices, saved receipt details, supplier assignments, reports, and approvals are excluded by the server, not merely hidden on screen.
2. **Finished** sets the restaurant quantity to zero after confirmation. It does not decrement one unit. If a stock value changed since the screen was loaded, the server rejects the stale change; refresh and check again. Staff cannot change garage counts.
3. **Request transfer** submits a positive quantity to move from garage to restaurant. Requests do not reserve or move stock. An administrator confirms the physical movement on Transfers.
4. **Delivery** accepts a JPG/PNG photo or PDF up to 5 MB, manually entered lines, or both. Date, supplier, destination, and any invoice reference should be entered. An attachment-only submission can have no lines; an administrator adds them during review. Notes are optional.
5. Manual lines use existing SKUs, positive quantities, and nonnegative prices per stock unit. Staff can enter prices from a new invoice but cannot retrieve saved prices. Missing SKUs must be created by an administrator before line entry or approval.
6. Nothing is added to stock until approval. After submitting, a success message confirms storage. Staff cannot review submitted receipts because those can contain prices. For a correction, tell the manager which invoice needs review.

### Owner and manager

Both accounts have equal business permissions and separate sign-ins; the audit trail records which account made each change. Only the Google account owning the script can administer deployment and password resets.

- **Approvals → Review**: download the private attachment through the app, compare the invoice number against Receipt history, correct supplier/date/location/line quantities and prices, enter missing lines, and approve or reject. Tax/shipping/other costs are entered once per receipt. Use net nonnegative unit prices after discounts. The app does not automatically allocate tax to unit price history.
- Approval adds all lines in one journal record and records unit price history. Already handled receipts cannot be approved again, even with a different request ID. This does not detect the same physical invoice uploaded as two different submissions: administrators must check invoice references before approval.
- **Transfers → Confirm moved**: use only after the goods physically move. Approval atomically subtracts garage stock and adds restaurant stock, rejecting insufficient garage stock. Reject cancels a request without changing quantities.
- **Stock → Count / adjust**: enter a physical count and reason. Corrections and waste affect stock only. There is no automatic sales/POS consumption integration. Record counts regularly or mark items finished.
- **Shopping**: one automatically calculated list per primary supplier; alternative suppliers are shown. Items without a primary supplier go to Unassigned. Shopping lists are calculated whenever data is refreshed, without a scheduled trigger. Pending receipts/requests do not reduce purchases. CSV export is available.
- **Reports**: monthly approved purchasing spend (line totals plus entered extra costs), per-SKU unit price history, first-to-latest percentage change, a purchase-sequence price chart, receipt status/history, and CSV price export. Currency display is USD. This is not accounts payable, inventory valuation, or cost-of-goods-sold accounting.
- **Catalog**: export or update the catalog. An existing SKU's unit cannot change because historical quantities and prices would become incomparable. Rename its description freely. There is no delete button; records and history are retained. Set target to zero for a discontinued item.

The app refreshes every 60 seconds on read-oriented screens and after successful changes. Form screens do not auto-refresh to avoid erasing input. Use Refresh to retrieve changes made on another device. There is no offline mode.

## 4. Google Sheets backend and reliability

`InventoryEvents` is the live authoritative backend. Each row contains ID, timestamp, account, event type, and a JSON payload. Stock, pending approvals, and reports are rebuilt from these records. This format keeps multi-line receipt approvals and both sides of a transfer in a single write; the app does not maintain fragile separate totals that can become inconsistent after a partial update.

- Keep this tab's header and all historical records intact. Do not manually edit/delete rows or use it as a general-purpose spreadsheet. Use app forms and CSV imports instead. Spreadsheet editors can bypass all app controls, so grant editor access only to trusted administrators.
- All mutations use a script-wide lock, server-side role checks, and request IDs. Stale stock counts are rejected. A timed-out transfer or stock operation should be checked after Refresh before creating a new request. Receipts keep the same request ID while their submission form remains open. Once submitted, approval status prevents replaying an approval.
- A failed upload/write can leave an unattached private Drive file. These do not change stock; check the event records before manually cleaning up such files. Repeated receipt submission from the same open form reuses its attachment filename.
- Back up the Sheet periodically with **File → Make a copy**, and separately back up receipt files. Do not delete the original project: its Script Properties hold the database/folder IDs, authentication secret, and account records. A Sheet-only copy is a data backup, not a fully configured app deployment. To migrate, create a fresh install, copy the event records into its event tab, and preserve or migrate the private receipt files and IDs; do not deploy a copied Sheet without checking those references.
- Corrections to approved quantities can be made with an explained stock adjustment. This version intentionally has no receipt reversal, supplier return, negative credit-note, or editing of approved spend. Check approvals carefully; financial-history corrections require a reviewed extension to the code, not deleting a historical event.

## 5. Password and security limitations

The custom sign-in is a practical small-team gate, not a managed identity provider. It does not provide MFA, account recovery, per-employee identity, security alerts, IP rate limiting, or enterprise guarantees. A shared staff credential cannot establish which employee acted. Anyone holding an owner or manager password has full business access.

- Initial passwords are long random generated secrets. They are stored as salted HMAC values with a separate application secret in Script Properties, rather than plaintext. This is not a memory-hard password KDF and should not be repurposed for short human-chosen passwords. Script editors can access the secret and all business data.
- Ten wrong password attempts lock that account for 15 minutes. This is a persistent account-level throttle, not a complete defense against distributed attacks or deliberate account lockout. Public calls still consume the owner's Apps Script quota.
- Signed sessions expire after eight hours and are held only in page memory. Reloading requires login. Logout clears this browser's copy but does not revoke a copied/stolen token; that token remains usable until expiry or a password reset. Use trusted devices and close shared-device tabs.
- To rotate or recover credentials, the script owner runs **resetPasswords_** from the Apps Script editor. It generates three new passwords and revokes every existing session. Retrieve the new passwords from the execution log and distribute them privately. This resets all three accounts together.
- Receipt files stay private in Drive; authorized admins download them through a server endpoint that checks their role. There are no public file-sharing links. The server only serves attachments recorded on receipts.
- Content is escaped before browser display. CSV exports neutralize spreadsheet formula prefixes. Uploads are restricted by stated MIME type and size, but are not malware-scanned; only submit trusted restaurant receipts.
- Prefer a Google-account or organization deployment gate when available. Because the web app executes as its owner, Google may not expose the visitor's email; the app does not pretend `Session.getActiveUser()` identifies the visitor. A properly designed Google identity/allowlist system would be a separate improvement, with different deployment constraints.

## 6. Free OCR: what is and is not included

Receipt upload and manual review are fully included. **Automatic OCR and automatic receipt parsing are not included.** No paid Vision API, AI subscription, advanced Drive service, or third-party receipt service is called.

For optional free OCR, the Google account that owns the receipt folder can open Drive, find the receipt, right-click it, and choose **Open with → Google Docs**. Google Drive may extract text into the document. Its guidance recommends images/PDFs of 2 MB or smaller, upright, clear text. The app's upload maximum is 5 MB, so larger uploads may need compression or manual transcription for this separate OCR workflow. Copy the extracted information into approval fields and verify quantities, decimal points, pack sizes, discounts, and supplier names. OCR does not reliably map invoice descriptions to your SKUs or preserve tables. It never updates inventory automatically in this app.

Managers using only the custom login do not automatically have Google Drive permissions; they can download a receipt through the app and use their own authorized Drive account for optional OCR, following your restaurant's document-handling practice.

## 7. Free-tier capacity and troubleshooting

The design has no artificial total item limit. Google nevertheless imposes Apps Script quotas, execution time and concurrency limits, Sheets capacity limits, and Drive storage limits. Limits can change. Every full refresh reads the event log, so a growing transaction history eventually makes this architecture slower. For a single restaurant with 500+ SKUs this is a reasonable starting design, but no measured production capacity or unlimited scale is claimed. Heavy traffic, years of dense logs, or lots of large receipts may require reviewed archiving or a different backend.

No billing account is needed. If your free storage or quotas are exhausted, operations fail or pause; this app does not automatically buy capacity. Avoid uploading duplicate receipts and monitor Google storage. All execution/storage is charged against the deployment owner's quotas.

- **Blank page / function not found**: confirm `Index.html` filename, save files, and deploy a new version.
- **Permission denied / authorization required**: run setup from the editor, authorize the requested scopes, and check web-app access policy and Execute as Me.
- **Session expired**: sign in again. Password rotation invalidates all sessions.
- **Stock changed**: refresh and retry after checking the current quantity.
- **Unknown SKU**: add it in Catalog or correct the line's SKU.
- **Too many attempts**: wait 15 minutes and use the generated password. Google project access, not app login, is needed to reset passwords.
- **Quota/timeout error**: wait and retry after checking whether the action was already saved. Do not submit the same invoice as a new delivery just because a response timed out.
- **Setup partly failed**: inspect the Sheet, private folder and Script Properties before rerunning. Avoid deleting a database with existing data. A brand-new empty installation can be restarted in a new blank Sheet/project.

## 8. Verified scope and Google references

Local automated checks passed for client JavaScript syntax, signed login/tamper rejection, staff permission enforcement and price redaction, stale counts, transfers and insufficient garage stock, pending receipts, approval replay prevention, invalid quantity validation, immutable stock units, metadata updates preserving quantities, and importing a 526-item catalog. These tests use a simulated Apps Script runtime; they are not a deployed Google-account test. Follow `ACCEPTANCE-TEST.md` after installation before entering real stock.

Official references (checked October 21, 2026):

- Web app deployment: https://developers.google.com/apps-script/guides/web
- Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- Session identity limitations: https://developers.google.com/apps-script/reference/base/session
- Free Drive OCR and its limitations: https://support.google.com/drive/answer/176692
- Private server functions ending in underscore: https://developers.google.com/apps-script/guides/html/communication
