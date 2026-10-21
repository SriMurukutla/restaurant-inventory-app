# Restaurant Inventory App

A Google Apps Script web app with a Google Sheets backend for restaurant and garage inventory. No paid services or external JavaScript dependencies are required; Google account quotas and storage limits apply.

## Setup

Follow [START-HERE.md](START-HERE.md) to install the files in a spreadsheet-bound Apps Script project and deploy the web app. Uploading this repository to GitHub does not deploy the app.

## Features

- Separate owner and manager accounts, plus a shared restricted staff account
- Restaurant and garage stock, finished-item marking, and transfer approvals
- Receipt photo/PDF uploads and manual delivery entry with admin approval
- Approved purchases update inventory and unit price history
- Multiple suppliers per item, a primary supplier, and automatic shopping lists
- Monthly purchase spend and price trends
- CSV catalog import/export; Excel files can be exported to CSV first
- No fixed total SKU cap; Google platform limits still apply

Automatic OCR is not included. The setup guide explains optional free Google Drive OCR, login limitations, backups, and operating constraints.

## Files

| File | Purpose |
| --- | --- |
| `Code.gs` | Apps Script server and authorization |
| `Index.html` | Web app interface |
| `appsscript.json` | Apps Script manifest |
| `catalog-template.csv` | Example catalog import |
| `START-HERE.md` | Installation and operating instructions |
| `ACCEPTANCE-TEST.md` | Live deployment checklist |
| `verify.cjs` | Local simulated-runtime checks |

## Verification

With Node.js installed, run:

```sh
node verify.cjs
```

Local checks cover permissions, stock changes, transfers, receipt approval replay protection, and a 526-SKU catalog. They do not replace testing in a deployed Google account. Follow the acceptance checklist before entering real inventory.

Keep generated passwords, tokens, receipt files, and real restaurant data out of this repository.
