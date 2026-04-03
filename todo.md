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
