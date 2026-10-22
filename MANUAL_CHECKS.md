# MANUAL CHECKS

Things a bot cannot test. Run these on real devices before sharing the funnel link. Tick each box and note the date and device.

Funnel link: https://apply.forgeforward.io/a/appointment-setter (use the Vercel URL until the domain is live).

## Status
Not run yet. The funnel is front-end only against mock data until the backend is deployed. Automated coverage so far: Playwright with Chrome fake camera and mic (funnel core 16/16, video flow 4 specs). Nothing below has been tested on a real device.

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

## Production only (after backend deploy)
- [ ] Test console at /admin/test: every check green, then "Delete test data" shows 0 left
- [ ] A real Cal.com booking moves the card to Interview booked
- [ ] Send a real email, WhatsApp and SMS to yourself with "Send test to me"
- [ ] Last night's backup exists in R2 and the restore test passed
