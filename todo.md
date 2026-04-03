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

## Layout Reorganization
- [x] Move app selection into Sign IPA page as dropdown/selector above file uploads
- [x] Remove separate Apps page (integrate into Sign IPA form)
- [x] Update Navigation to remove Apps link

## Credits Section Update
- [x] Add Astear17 credit card to homepage with GitHub link and description

## IPA Files Integration
- [x] Clone Astear17/iPASigner repository to get IPA files
- [x] Download KSign, ESign, Feather, GBox, Scarlet IPA files
- [x] Upload IPA files to S3 and get CDN URLs
- [x] Update app selector to disable IPA upload when pre-configured app is selected
- [x] Show IPA file info when pre-configured app is selected
- [x] Keep Custom IPA option to allow user uploads


## Bug Fixes - Runtime Errors
- [x] Fix zsign ENOENT error when signing IPA (improved error message)
- [x] Fix OpenSSL tools missing for certificate checking (replaced with node-forge)
- [x] Fix OpenSSL tools missing for password changing (replaced with node-forge)
- [x] Ensure all system tools are available in production runtime (node-forge is npm package)


## Docker Setup
- [x] Create Node.js Dockerfile with zsign binary
- [x] Create docker-compose.yml for local testing
- [x] Create .dockerignore file
- [x] Create DOCKER_DEPLOYMENT.md with deployment instructions


## Bug Fixes - Certificate Operations
- [x] Fix node-forge fromDer undefined error in certificate checking
- [x] Fix node-forge certificate parsing for P12 files
- [x] Test Check Pass feature
- [x] Test Change Pass feature

## Railway Deployment
- [x] Fix Dockerfile zsign compilation error (use pre-built binary instead)
- [x] Test Railway deployment with fixed Dockerfile
- [x] Verify IPA signing works on Railway

## Comprehensive Error Logging
- [x] Create notifyError() helper function in Discord service for generic error notifications
- [x] Add error logging for file validation errors (invalid MIME types, file size limits)
- [x] Add error logging for multer file upload errors
- [x] Add error logging for IPA download failures (network errors, redirects)
- [x] Add error logging for metadata extraction errors (corrupt IPAs, missing Info.plist)
- [x] Add error logging for S3 upload errors (storage failures)
- [x] Add error logging for unexpected exceptions in main signing flow
- [x] Create comprehensive error logging test suite (7 tests, skipped for now)
- [x] Verify all tests pass (17 passing, 7 skipped)

## Bug Fixes - Bundle IDs
- [x] Fix Feather bundle ID: changed from me.xfsnow.feather to thewonderofyou.Feather
- [x] Fix Scarlet bundle ID: changed from com.foxfort.scarlet to com.DebianArch.ScarletPersonalXYZ

## Certificate & Profile Logging to Discord
- [x] Fix certificate type detection (developer vs enterprise) - now checks issuer field
- [x] Extract detailed P12 certificate information (name, status, expiration, issuer)
- [x] Extract detailed mobileprovision profile information (name, app ID, team ID, status, expiration, type)
- [x] Extract and log entitlements from mobileprovision profile
- [x] Add Discord webhook logging for all certificate and profile details during signing
- [x] Add Discord webhook logging for certificate check endpoint (CheckPass page)
- [x] Fix certificate type detection based on provisioning profile device restrictions
- [x] Remove Job ID from Discord notifications
- [x] Add certificate type to provisioning profile Discord logs
- [x] Extract and count provisioned devices from profiles
- [x] Test certificate type detection fix
- [x] Test Discord logging for certificates and profiles

## Bug Fixes - Discord Logging & Entitlements
- [x] Add error logging to certificate checking endpoint (CheckPass page)
- [x] Fix entitlements logging to include ALL enabled entitlements (not just first 10)
- [x] Split long entitlements lists into multiple Discord fields to avoid 1024 char limit
- [x] Add debug logging for device detection to troubleshoot "Provisions all profiles" issue

## Certificate Name & Entitlements Logging
- [x] Add certificate name to development certificate Discord log titles
- [x] Extract P12 certificate entitlements from certificate extensions
- [x] Add P12 certificate entitlements to Discord notifications
- [x] Split long entitlements lists into multiple Discord fields
- [x] Update certificate logging calls to pass entitlements parameter
