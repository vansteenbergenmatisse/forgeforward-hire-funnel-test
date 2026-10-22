# MANUAL CHECKS

Things a bot cannot test. Run these on real devices before sharing the funnel link. Tick each box and note the date and device.

Funnel link: https://forge-hire.vercel.app/a/appointment-setter (switch to https://apply.forgeforward.io/a/appointment-setter once the domain is live).

## Status
Not run yet. The first Vercel deploy is live; run these on real devices now. Automated coverage so far: Playwright with Chrome fake camera and mic (funnel core 16/16, video flow 4 specs). Nothing below has been tested on a real device.

## Real iPhone Safari
- [ ] Form: phone country picker, time zone select, keyboard does not hide the main button
- [ ] A04 turn on camera shows the iOS permission prompt, then a live mirrored preview and a moving mic bar
- [ ] Denied permission shows the iPhone help text and Try again works after changing Settings
- [ ] Record 60 s: countdown, Finish unlocks at 10 s, auto stops at 0, screen stays awake
- [ ] Locking the phone or switching apps mid-recording stops it with "Your recording stopped. Let's try again." and does not use the retake
- [ ] Review plays back with sound (silent switch off), Retake works once, then "This is your final take."
- [ ] Upload on Wi-Fi, then on weak mobile data. Turn on airplane mode mid-upload: "Your connection dropped." and Try again works
- [ ] The saved video plays in the dashboard drawer on desktop Safari and Chrome (mp4/H.264)
- [ ] Rotate the phone mid-recording: recording continues

## Real Android Chrome
- [ ] All items above, using the Android help text for denied permission
- [ ] Recording is video/webm: dashboard player can seek (duration fix applied)
- [ ] Camera switcher appears and switches front and back camera

## Facebook in-app browser (open the link from a Facebook ad or Messenger)
- [ ] "Open in your browser" screen shows first, Copy link works, Open in Chrome works on Android
- [ ] "Continue here anyway" then camera blocked shows the handoff link, copy it, open in Chrome or Safari, the form is already saved
- [ ] The handoff link works once and expires after 24 hours

## Instagram in-app browser
- [ ] Same checks as Facebook

## Desktop browsers (laptop layout)
- [ ] Chrome, Safari and Firefox: funnel at 1440 wide, camera works, upload works
- [ ] Dashboard in Chrome and Safari: drag a card, open a video, play at 1x, 1.5x and 2x

## Automated device end-to-end check (production)
`pnpm test:e2e:devices` (config `playwright.devices.e2e.config.ts`, specs in `e2e/devices-e2e/`) submits a real application through the funnel UI on 14 device and browser profiles (iPhone SE/13/15/15 Pro Max, iPad Pro 11, Pixel 5/7, Galaxy S9+/Tab S4, desktop Chrome/Firefox/Safari at 1440x900, Windows-like 1920x1080 Chrome or Edge, Linux Firefox). Per device it checks the database row, the video object in R2 (size equals the saved size) and the dashboard drawer (stage, video loads).
- Needs `ADMIN_KEY` and `ADMIN_PASSWORD` in the environment or `.env.local`. For the direct Postgres check also `DATABASE_URL_UNPOOLED` of the target database, or `E2E_DB_ENV_FILE=<file holding it>`. Target defaults to https://apply.forgeforward.io (`E2E_BASE_URL` overrides). `--project=pixel-7` runs one device.
- It writes only `is_test` data: each same-origin `/api/apply/**` request carries a freshly signed test-console header (never sent to the R2 upload). A global teardown always runs `DELETE /api/admin/test/data` and fails if any row or file is left.
- The board card check needs the admin-only `?test=1` board option (shows test applicants). Until a deploy has it, run with `E2E_SKIP_BOARD=1`; the drawer check still runs.
- Real Windows, macOS and Linux machines: run the GitHub Action "Devices end-to-end (production)" (manual). It needs the secrets `ADMIN_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL_UNPOOLED`.
- Still manual: real iPhone and Android hardware cameras, the real Facebook and Instagram in-app browsers, real Windows Edge on hardware, weak mobile networks.

## Production only (after backend deploy)
- [ ] Signed out, /adminMatt shows the login page; a wrong password shows "Wrong password."; the right one opens the dashboard (also on iPhone Safari: the field does not zoom, the password manager offers to fill)
- [ ] Sign out lands on the login page; /adminMatt/k/<ADMIN_KEY> still signs in
- [ ] Test console at /adminMatt/test: every check green, then "Delete test data" shows 0 left
- [ ] A real Cal.com booking moves the card to Interview booked
- [ ] Send a real email, WhatsApp and SMS to yourself with "Send test to me"
- [ ] Last night's backup exists in R2 and the restore test passed

## Device matrix (automated, read-only)
Run: `pnpm test:devices` (live site, https://apply.forgeforward.io) or `E2E_BASE_URL=<url> pnpm test:devices`. `pnpm test:devices:local` targets a dev server on port 3101. Set `ADMIN_PASSWORD` in the shell to include the signed-in dashboard pages (never printed). Report: `test-results/devices-report/`, screenshots: `test-results/devices/<device>/<page>.png`.
- Covers: 19 projects (iPhone SE to 15 Pro Max incl. 15 landscape, iPad gen 7, iPad Pro 11, Pixel 5/7, Galaxy S8/S9+/Tab S4, desktop Chrome/Firefox/Safari, a 320x568 phone). Per device: page loads, no sideways scroll, tap targets (fail under 44 px, 48 px noted), input font 16 px+, main button not clipped, no console or CSP errors, fonts, security headers, stubbed 500 error state, form to video step, Facebook and Instagram in-app screen, admin login and 404s.
- Read-only: the browser answers every `/api/apply/**` call itself and blocks R2, so no applicant or video is ever created. The test fails if any such request gets through. The only writes are one admin login (cookie and one audit row) and one failed key try on `/adminMatt/k/wrong`.
- Cannot cover: real iOS camera and recording (WebKit has no fake camera, so it checks the permission-denied screen), the real Facebook and Instagram in-app browsers (only their user agents), real touch keyboards, notches and toolbars, and the upload to R2.
- For those: BrowserStack or another real-device cloud, Xcode Simulator, Android Studio emulator. Playwright can also drive a real Android device or emulator over adb (`_android`) as an optional next step.
