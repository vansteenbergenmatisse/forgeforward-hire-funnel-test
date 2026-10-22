# FUNNEL SPEC: Forge Hire

Every screen, stage and rule. Source of truth. If something is unclear, ask Matt.

Words used
- Project: one role Matt hires for. Example: Appointment Setter.
- Applicant: one person who opened a project link and sent the form.
- Funnel step: where the applicant is in the apply flow (A0 to A8).
- Pipeline stage: a column on Matt's board (New, Did task and so on).

---

# Part A: Applicant journey

The funnel lives at /a/[slug]. One page with steps.
A thin progress bar at the top shows 4 parts: Details / Video / Task / Done.
Phones first. A page refresh keeps their place (resume_token in localStorage). There is no "finish later" email link.

## A0. Link opens

A0.1 Load the project by slug.
- Slug not found: "This page does not exist."
- Project closed: "Applications for this role are closed."

A0.2 Read utm_source, utm_medium, utm_campaign, utm_content, utm_term and fbclid from the URL. Keep in memory. They go with the form.

A0.3 In-app browser check. Look for FBAN, FBAV, Instagram, TikTok, Bytedance, LinkedInApp or Line in the user agent.
- Found: show the "Open in your browser" screen first.
  - Text: "The video step works best in Chrome or Safari. Tap the button to copy this link. Then paste it in your browser."
  - Button: "Copy link"
  - Android only: second button "Open in Chrome" (intent:// link).
  - Small link at the bottom: "Continue here anyway"
  - Save in_app_browser = true on the applicant later.
- Not found: go to A0.4.

A0.4 Intro block above the form
- Role name as heading.
- One short paragraph about the role (editable per project, General tab).
- Line: "Takes about 5 minutes. You need a camera or a mic."

## A1. Contact form

A1.1 Fixed fields (every project)

| Field | Rule |
|---|---|
| First name | Required. 1 to 60 characters. |
| Last name | Required. 1 to 60 characters. |
| Email | Required. Valid email. Stored lowercase. |
| Phone | Required. Country code picker plus number. Valid per libphonenumber-js. Stored as E.164. Default country from browser locale. |
| Can we contact you on WhatsApp? | Required. Yes or No. |
| Your time zone | Required. Searchable list of IANA zones. Prefilled from the browser. |

A1.2 Project questions
- Below the fixed fields in saved order.
- Types: short text / long text / number / single choice / multi choice / yes or no.
- Each can be required or optional. Each can show help text.
- Archived questions never show.
- Appointment Setter default question: "How many years have you done appointment setting?" Single choice: None / Less than 1 year / 1 to 2 years / 3 to 5 years / More than 5 years. Required.

A1.3 Consent
- Required checkbox.
- Text: "I agree that Forge Forward can contact me about this job by email, text and WhatsApp."
- Save the exact text and the time they ticked it.

A1.4 Spam guard
- Hidden honeypot field. If filled, show a fake success and save nothing.
- Max 5 form posts per IP per 10 minutes.
- Calls from the test console skip this limit. They carry a header signed with ADMIN_KEY.

A1.5 Submit
- Button: "Next: your video"
- Inline errors under each field. Scroll to the first error.
- Button shows a spinner and locks until the server answers.
- POST /api/apply/start with an idempotency key made once per form.
- Server:
  - Validates with zod.
  - Checks for the same email in the same project. If found it still saves a new applicant. It sets applied_before = true and links previous_applicant_id.
  - Creates the applicant with funnel_step = form_done and stage_id = null. Shows in "Did not finish" (C5) until A7.
  - Writes event form_submitted.
  - Returns applicant_id and resume_token.
- Network error: "We could not save that. Check your connection and tap Next again." Keep every typed value.

## A2. Camera and mic check

A2.1 Text: "Next you record a 60 second video. First let's check your camera."

A2.2 Button "Turn on camera". Calls getUserMedia for video (720p max, front camera) and audio.

A2.3 Results
- Camera and mic work: live mirrored preview and a mic level bar. Text: "Looking good. Say something and watch the bar move." Button: "Continue".
- No camera or camera fails but mic works: switch to audio-only mode. Text: "We could not find a camera. No problem. You can record with your voice." Button: "Continue".
- Permission denied: short help for their device (iPhone Safari / Android Chrome / desktop Chrome). Button: "Try again".
- No mic at all: "We need a microphone to continue." Button: "Try again".
- No MediaRecorder: "Your browser is too old for the video step. Open this link in Chrome or Safari." Button: "Copy link".
- More than one camera: small camera switcher.

A2.4 Handoff link (the one exception to "no coming back")
- Shows only when camera and mic both fail inside an in-app browser.
- Matt can turn it off per project (General tab, handoff_enabled).
- Text: "This app blocks your camera. Copy this link and open it in Chrome or Safari to finish."
- Link carries a one-time token. Expires in 24 hours. Drops the applicant into A2 in the new browser with their form already saved.
- Using it writes event handoff_used.

## A3. Prep (60 seconds)

- Show the project video prompt in large text.
- Default prompt: "Introduce yourself in 60 seconds. Who are you? Where do you live? Why would you be a great appointment setter?"
- Camera preview. Audio-only mode shows a mic icon.
- Countdown from prep_seconds (60). Text: "Take a minute to get ready."
- Button: "I'm ready". Starts the recording early.
- At 0 the recording starts on its own.
- Both ways play a 3, 2, 1 countdown first.

## A4. Recording (max 60 seconds)

- Red dot and countdown from max_record_seconds (60).
- Prompt stays on screen in small text.
- Button "Finish" unlocks after 10 seconds.
- At 0 the recording stops on its own.
- Under 5 seconds: "That was short. Try again." Does not use the retake.
- Keep the screen awake with Wake Lock API (try/catch).
- Tab goes to background: stop recording. "Your recording stopped. Let's try again." Does not use the retake.

## A5. Review and retake

- Play the recording back.
- Buttons: "Use this video" and "Retake (1 left)". Retake goes back to A3 with full prep time.
- After one retake the button disappears. Text instead: "This is your final take."
- Set retake_used when they use it.

## A6. Upload

- Starts when they tap "Use this video".
- Text: "Saving your video. Keep this page open."
- Progress bar with percent.
- Steps:
  1. Store the blob in IndexedDB.
  2. Get signed URLs from /api/apply/upload-url (needs resume_token).
  3. PUT the video. PUT the thumbnail (skip in audio-only mode).
  4. Retry each PUT up to 5 times with backoff.
  5. Call /api/apply/video/complete. Server HEADs the object and checks byte count. Then saves video_key, video_mime, video_bytes, video_seconds, audio_only, retake_used, thumb_key. Sets funnel_step = video_done. Writes event video_saved.
  6. Clear the blob from IndexedDB.
- All retries fail: "Your connection dropped. Your video is still here. Tap to try again." Button: "Try again". Blob stays while the page is open.
- Tab closed during upload: on reopen with same resume_token show "Finish saving your video".
- R2 paths:
  - videos/{project_slug}/{applicant_id}/{timestamp}.{ext}
  - thumbs/{project_slug}/{applicant_id}/{timestamp}.jpg
  - tasks/{project_slug}/{applicant_id}/{filename}

## A7. Optional task

- Task off: skip this step. Go to A8, land in entry_new stage.
- Heading: task_title.
- Body: task_content rendered from Tiptap (headings, subheadings, bold, italic, lists, links, images). Links open in a new tab.
- Default task:
  - Title: "Optional task: your first text"
  - Body: "A landscaping company owner just filled in our form. Write the first text you'd send him. Your goal is to get him on a call."
- Answer fields (each a toggle in settings):
  - Text answer: on by default. Max 5,000 characters.
  - Link: on by default. Valid URL.
  - File upload: off by default. Max 25 MB. Same signed upload flow as A6.
- Buttons:
  - "Submit task". Needs at least one filled field.
  - "Skip task". Asks once: "Skip the task? People who do it stand out."
- Submit: did_task = true. Stage = entry_task (Did task). Event task_submitted.
- Skip: did_task = false. Stage = entry_new (New). Event task_skipped.
- Both: funnel_step = completed, completed_at = now, event application_completed.
- Write goes through /api/apply/task with an idempotency key.

## A8. Thank you

- Default text: "Thanks, {first_name}. We got your application. We watch every video ourselves. If you fit the role, we reach out on WhatsApp or email within {reply_days} days."
- No buttons.
- Clear this applicant from localStorage.

---

# Part B: What gets saved and when

| Moment | Saved | Where Matt sees it |
|---|---|---|
| A1 submit | Contact fields, answers, consent, utm, user agent | "Did not finish" tab |
| A6 confirmed | Video or audio, thumbnail, length, retake used | "Did not finish" tab |
| A7 submit or skip | Task answer or skip, did_task, completed_at, stage | Did task or New column |
| Matt drags a card | stage_id, last_stage_change_at | The column he picked |
| Cal.com booking | Booking info, stage | Interview booked column |

Every row above also writes one applicant_events row.

---

# Part C: Pipeline stages

## C1. Default stages for every new project

| # | Stage | Color | Positive | Role |
|---|---|---|---|---|
| 1 | New | gray | no | entry_new |
| 2 | Did task | blue | no | entry_task |
| 3 | Interview booked | amber | yes | on_booking |
| 4 | Interviewed | purple | yes | |
| 5 | Trial | teal | yes | |
| 6 | Hired | green | yes | |
| 7 | Rejected | red | no | |

Positive means applicants in that stage are never auto-deleted (Part F).

## C2. How applicants enter the board
- Task submitted: entry_task stage.
- Task skipped or task off: entry_new stage.
- Cal.com booking: on_booking stage. Never moves a card out of Hired or Rejected.

## C3. Moving cards
- Drag a card to any column, or pick a stage in the drawer.
- Each move writes event stage_changed with from and to.
- Moving a card older than 25 days out of a positive stage warns: "This video deletes within {X} days."

## C4. Editing stages (Settings, Stages tab)
- Add, rename, recolor, reorder by drag, mark positive, delete.
- Set which stage holds each role. Each role sits on exactly one stage.
- Deleting a stage with cards asks where to move them first.
- A stage that holds a role cannot be deleted until Matt moves the role.

## C5. "Did not finish" tab
- Applicants with no completed_at, newest first.
- Each row shows progress: "Form only" or "Form + video".
- Matt can move one onto the board with a stage picker. funnel_step stays as it was.
- Same retention rule as everyone else (Part F).

---

# Part D: Dashboard

## D1. Access
- Password login: Matt opens /adminMatt, which shows a login page, and enters `ADMIN_PASSWORD`. Sets the admin cookie (30 days, HttpOnly, Secure, SameSite=Lax).
- Fallback: /adminMatt/k/{ADMIN_KEY} still sets the same cookie. Empty or unset `ADMIN_PASSWORD` turns password login off.
- Limit: 8 wrong passwords per IP in 15 minutes (stored in Postgres), then 429 "Too many tries. Wait 15 minutes." A correct password does not count. Wrong tries go to system_errors, a success to admin_audit (no password, no IP).
- Without the cookie only /adminMatt and /adminMatt/login (the login page) answer. Every other admin page and the admin API return 404. Signing out lands on the login page.
- Changing ADMIN_KEY on Vercel logs out every device.
- Every admin page sends noindex. robots.txt does not list it, so the path is not published. The gate answers 404 and sends noindex.

## D2. Projects home (/adminMatt)
- One card per project: name, open or closed, applicants this week, count per stage, funnel link with copy button.
- "New project" offers: Blank (default stages and fixed fields only) or Duplicate (copies questions, video settings, task, stages, templates and thank-you text from a project Matt picks).
- Red banner at top for an unresolved system error or a missing backup.
- "Unmatched bookings" box when Cal.com sent a booking with no matching applicant. Matt can link it to an applicant or dismiss it.

## D3. Project board (/adminMatt/p/[slug])
- Columns follow stage order. Each shows a count.
- Tabs: Board / Did not finish / Table.
- Table tab: everyone in one sortable list with CSV export.
- Search by name, email or phone.
- Filters: did task / audio only / applied before / score / date range.
- Sort inside a column: newest first (default) or score.
- Test applicants (is_test) never show here.

## D4. Card
- Thumbnail with play icon. Audio only shows a mic icon.
- Full name and country flag from phone number.
- Their local time now. Example: "9:42 pm their time".
- Years of appointment setting. Other projects show their first single-choice answer.
- Badges: Did task / Audio only / Applied before / Booked {date} / Cancelled / Deletes in X days (from day 25).
- Score stars when set.
- Unread dot when a WhatsApp reply came in.

## D5. Applicant drawer
- Video player with signed URL (1 hour). Speed 1x / 1.5x / 2x. Download link if the browser cannot play the file.
- Contact block: email, phone, WhatsApp yes or no, time zone and local time. Copy button on each.
- Every answer with its question label.
- Task answer: text, link (clickable), file (download).
- Score 1 to 5. Notes field that autosaves.
- Stage picker.
- Message buttons: WhatsApp (only when whatsapp_ok), SMS, Email. See Part E.
- Message list (in and out) with status.
- Timeline of every event with time.
- Booking info when booked.
- Delete applicant: Matt types DELETE to confirm. Removes row, events, messages and R2 files.

## D6. Project settings (/adminMatt/p/[slug]/settings)
- General: name, slug, open or closed, intro paragraph, Cal.com event link, handoff on or off, reply_days. Changing the slug asks to confirm because shared links break.
- Form questions: add, edit, reorder by drag, required toggle, archive. Delete always archives.
- Video: prompt text, prep seconds, max record seconds, retakes allowed.
- Task: on or off, title, Tiptap editor (H1, H2, bold, italic, lists, links, images), answer field toggles.
- Stages: see C4.
- Messages: templates per channel (E2).
- Thank-you page: text with variables.

## D7. Test console (/adminMatt/test)

"Run full test" runs each check in order against the live stack. Each row shows pass or fail, time taken and error text.

1. Database write and read
2. R2 put, HEAD and delete
3. Create a test applicant through /api/apply/start
4. Upload a 3 second sample video (test-assets/sample.webm) through the real signed upload flow
5. Video complete check (HEAD and byte count)
6. Task submit. Stage lands on Did task.
7. Stage drag through the admin API
8. Signed Cal.com webhook moves the card to Interview booked
9. Same webhook again does nothing
10. Email, WhatsApp and SMS dry run (template fills, mode shows api or link)
11. Retention dry run (lists what it would delete, deletes nothing)
12. Last backup is under 26 hours old
13. Integrity dry run (lists missing files, changes nothing)

Other buttons
- "Send test to me" per channel. Sends to TEST_EMAIL and TEST_PHONE.
- "Delete test data". Shows count of test rows and files first. Deletes every is_test row and its R2 files. Then shows "0 left".

---

# Part E: Messages

## E1. Buttons and modes
- Three buttons in the drawer: WhatsApp / SMS / Email.
- API mode (env keys present): modal with template picker, filled preview and edit box. "Send" sends from the server. Message row stores provider id and status.
- Link mode (keys missing): button opens wa.me, sms: or mailto: with the filled text. App saves a message row with mode = link and status = opened_link.
- The modal shows which mode is on.

## E2. Templates (Settings, Messages tab)
- Per project and per channel. As many as Matt wants.
- Each has a name and body. Email templates also have a subject.
- Variables: {first_name}, {last_name}, {project_name}, {cal_link}
- A missing variable blocks the send and names it.
- Default template on all 3 channels, named "Interview invite":
  - Email subject: "Your Forge Forward interview"
  - Body: "Hi {first_name}, thanks for your video. We'd like to meet you. Pick a time here: {cal_link} Talk soon, Matt (Forge Forward)"

## E3. Channel rules

Email (Resend)
- From EMAIL_FROM. Reply-to EMAIL_REPLY_TO.
- Plain text plus a simple branded HTML version.

WhatsApp (Cloud API)
- First message must be a Meta approved template.
- Each WhatsApp template stores the Meta template name, language and variable order.
- Free text replies only work within 24 hours after the applicant's last message. Modal shows if the window is open.
- Status updates (sent / delivered / read / failed) and inbound replies come in through the webhook.
- Inbound reply sets the unread dot on the card. Opening the drawer clears it.

SMS (GoHighLevel)
- Upsert the contact in GHL by phone. Then send through the conversations API.
- Replies show up in GHL. They do not come back here.

## E4. Cal.com
- Personal link per applicant: {cal_link}?name={first_name} {last_name}&email={email}&metadata[applicant_id]={id} (URL-encode every value).
- BOOKING_CREATED:
  - Find applicant by metadata.applicant_id. Fall back to attendee email (newest match).
  - Save booking uid, start, end and status.
  - Move to on_booking stage unless the card sits in Hired or Rejected.
  - Event booking_created.
- BOOKING_RESCHEDULED: update the time. Event booking_rescheduled.
- BOOKING_CANCELLED: status cancelled, show Cancelled badge. Card stays put. Event booking_cancelled.
- No match: save to unmatched_bookings (D2).
- Repeat webhooks: drop with processed_webhooks (booking uid plus trigger event).

---

# Part F: Applicant retention (changed 2026-10-22: whole applicant, not only video)

- Runs daily at 03:00 UTC.
- Targets every applicant whose current stage is not positive and whose last stage change (or creation, or completion, whichever is latest) is more than 30 days ago. "Did not finish" applicants count too (empty stage, so not positive). Rejected counts as not positive.
- Deletes the applicant completely: row with personal details, answers, events, messages, notes, and the video, thumbnail and task file in R2. Nothing is kept.
- A card in a positive stage (Interview booked, Interviewed, Trial, Hired, or any stage marked Keep) is never deleted by this rule.
- A card moved today into Rejected gets 30 more days from the move. A card moved out of Rejected into a positive stage is no longer eligible.
- From day 25 the card shows "Deletes in X days".
- One audit row per run with counts only. A failed delete logs a system_errors row and retries next night.
- The Cal.com webhook is not used, so a booking does not move a card. Move booked applicants to a positive stage by hand, or they are deleted after 30 days.

---

# Part G: Edge cases

1. Same email twice in one project: both saved. Second gets "Applied before".
2. Same person in two projects: two separate applicants. No badge.
3. Double tap on any button: idempotency key keeps it to one write.
4. Invalid phone number: block with "Check your phone number".
5. Matt edits a question after people answered: old answers keep the old label.
6. Matt deletes a question: it gets archived instead.
7. Video over 60 MB: ask them to record again at 800 kbps. Does not use the retake.
8. Applicant rotates the phone mid-recording: keep recording.
9. Server error on any step: friendly retry message. Log to system_errors with applicant id.
10. Cal.com sends the same webhook twice: processed_webhooks drops the repeat.
11. WhatsApp marked No: the WhatsApp button stays hidden for that applicant.
12. Project closed while someone is mid-flow: let them finish.

---

# Part H: Brand and copy

- Colors: Signal Red #D93A31 for buttons and accents (Red Deep #B8302A for hover, Red Tint #FCEFED for selected and error backgrounds). Deep Charcoal #0E1220 for text and dark areas. Warm Ivory #FCFBF8 for backgrounds. Lines and borders use #E7E3DC and #D9D4CB. Source: the header comment of forge-hire-page-7.html.
- Fonts: Barlow Condensed for headings. Inter for body. Load both with next/font.
- Logo: /public/brand/.
- Tap targets: 48 px minimum. One main button per screen.
- Copy: short sentences. Plain words. No jargon. No em dashes.
- Dashboard: clean and dense. Charcoal sidebar. Ivory content area. Red only for main actions and alerts.
- Design reference: ~/Downloads/forge-hire-page-7.html (31 screens: A01 to A16 funnel phone + laptop, D01 to D15 dashboard). Pixel-match, rebuilt as clean Tailwind components. Screen to spec map is in the prototype header comment.
- Logo: the prototype logo is used as a React component (`src/components/brand/logo.tsx`). Drop official files in /public/brand/ if they differ.
