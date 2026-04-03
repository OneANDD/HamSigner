# IPA Signer — Project TODO

## Backend
- [x] DB schema: signing_jobs table (id, status, ipa_url, manifest_url, error, created_at)
- [x] Multer file upload endpoint: POST /api/sign (ipa, p12, mobileprovision, password)
- [x] Upload raw files to S3 temporarily
- [x] Run zsign binary to sign IPA
- [x] Upload signed IPA to S3
- [x] Generate ITMS manifest.plist and upload to S3
- [x] Return signed IPA URL + ITMS manifest URL to client
- [x] Error handling: invalid cert, wrong password, bad provision, zsign failure
- [x] Cleanup temp files after signing

## Frontend
- [x] Landing page with clean developer-tool design
- [x] File upload form: IPA, P12, password, MobileProvision
- [x] Progress indicator: Upload → Signing → Done
- [x] Results panel: download link + ITMS installation link
- [x] Error display for signing failures
- [x] Copy-to-clipboard for ITMS link

## Tests
- [x] Vitest: signing job status transitions
- [x] Vitest: ITMS manifest plist generation

## New Features
- [x] Update theme to dark blue & black space aesthetic
- [x] Homepage landing page with 3-feature menu cards
- [x] Persistent navigation bar across all pages
- [x] Check Certificate Validity feature (expiry, OCSP, chain)
- [x] Change Certificate Password feature
- [x] File size warning on Sign IPA page

## Label Updates
- [x] Change "Check Certificate" to "Check Pass" in navigation and landing page
- [x] Change "Change Password" to "Change Pass" in navigation and landing page

## HTML File Updates
- [x] Add all advanced options to Sign IPA section (Bundle ID, App name, Entitlements, Code signing, Output, Signing preferences)
- [x] Reorder certificate fields: IPA File → P12 File → MobileProvision → Password
- [x] Update P12 label and remove .pfx reference
- [x] Update "How it works" step 2 to "Signs the IPA with your certificate on the server"

## Bug Fixes
- [x] Remove PFX reference from P12 certificate file label in Change Pass page
- [x] Fix nested anchor tag error on Change Pass page
- [x] Fix nested anchor tag error on Landing page
- [x] Add credits section at bottom of homepage with Ham and Manus cards

## New Features - App Repository & Download
- [x] Create public app repository page with 5 apps (KSign, ESign, Feather, GBox, Scarlet)
- [x] Add app cards with descriptions and "Sign App" buttons
- [x] Implement app signing flow (pre-populate app name/bundle ID)
- [x] Add direct download option for signed IPA in results section
- [x] Update results UI to show both ITMS link and direct download button
