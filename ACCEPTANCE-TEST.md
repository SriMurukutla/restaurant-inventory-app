# Installation acceptance test

Use a fresh test installation, not real inventory. Keep owner, manager and staff in separate browser tabs (each tab signs in separately).

1. Import `catalog-template.csv`. Expect 4 items, all with zero stock. For DRY-001, set restaurant = 5 and garage = 10 with opening-count reasons.
2. Staff must see quantities but no Catalog, Shopping, Approvals or Reports tabs. Staff must not receive saved prices or receipt data. Opening a staff browser console and calling `getData` with that tab's token must still return only the restricted data.
3. As staff request 4 DRY-001 from garage. Stock stays 5/10 until manager confirms movement. After confirmation it must be restaurant 9, garage 6. Repeating approval must not change stock again.
4. Request 100 DRY-001 and try approving it. Expect insufficient stock; both quantities remain unchanged. Reject that request.
5. Submit a manual delivery: DRY-001 quantity 3, unit price $2, supplier Costco, restaurant location, extra costs $1. Before approval, stock is still 9/6. Approve as owner. Expect 12/6, unit price history $2, and monthly spend $7. A second approval must fail without changing stock or spend.
6. Submit an attachment-only JPG/PNG or PDF. Owner/manager must be able to download it, add lines, and approve. Staff must not be able to call the attachment endpoint successfully. Reject a separate test receipt; stock and spend must remain unchanged.
7. Mark DRY-001 Finished as staff. Restaurant becomes zero, garage stays unchanged. Requesting a transfer does not change those totals.
8. Check Shopping: target 100 minus current total equals suggested buy quantity, appearing once under Restaurant Depot, with Costco as an alternative. Change primary supplier in Catalog and verify that the item moves to the new supplier's list.
9. Export catalog, edit an item's description in the CSV, and reimport. Stock must remain unchanged. Importing the same CSV again must not duplicate catalog entries. Invalid negative targets, duplicate SKUs in one file, and changes to an existing unit must be rejected.
10. Check Reports, price history chart, receipt history, and CSV downloads. Confirm date grouping, line totals and extra costs against your test invoices.
11. Open the same stock screen on two admin tabs. Change a count in one tab, then submit a different count from the stale tab. Expect a refresh-required error rather than overwriting the newer count.
12. Log out, reload, and verify login is required. As the Google script owner, run `resetPasswords_`; all old passwords and existing sessions must stop working. Save the new passwords.

Do not use a successfully tested dummy installation as production without a clean data plan. The simplest approach is a separate blank Sheet/project for production, repeat installation, and import only your actual catalog and opening counts.
