# Working assumptions

Decisions made without the product owner, so the build could continue. Each is easy to revisit;
anything that changes architecture also has an ADR.

## Phase 3: AI placement assessment

- **Models are configurable** through environment variables. Defaults: Gemini `gemini-flash-latest`
  (Google's alias for its newest Flash model) and Groq `openai/gpt-oss-120b`. Both support JSON
  output in a given schema.
- **Without API keys the AI is unavailable, not broken.** Users then see a friendly "AI is resting"
  message. Local development and E2E tests use a deterministic `fake` provider, so no key is ever
  needed to run the app or the tests.
- **"Adaptive" means adaptive length and order.** One AI call writes a bank of 6 to 10 questions
  across five difficulty levels. The server presents them from easy to hard and stops early once
  the learner misses two questions in a row. One AI call per quiz keeps the free quota usable.
- **Question kinds:** multiple choice (graded by the server), short answer (graded by the AI in one
  batch call at the end), and "rate your confidence" statements (count as self-assessment).
- **Answer keys never reach the browser.** Questions are served one at a time without answers; the
  full quiz is stored in a top-level `assessmentKeys` collection that clients cannot read.
- **Level** is computed by pure domain code from per-sub-skill scores: Beginner below 35,
  Elementary below 55, Intermediate below 75, Advanced from 75. The AI writes only the explanation.
- **AI usage limits start now** to protect the shared free quota: 20 AI requests per user per day
  (the Free plan figure from the spec) and a global cap of 500 per day across all users. Pro limits,
  the usage meter UI and pricing arrive in phase 8. These are **soft** daily limits: the counts use
  atomic increments instead of a transaction, because every user shares the one global counter and
  a transaction there would make concurrent requests fail. Simultaneous requests can overshoot a
  limit by a request or two; no request is ever lost from the count.
- **The demo seed** gains a finished placement result for Spanish, so reviewers see the radar
  chart immediately.

## Phase 4: the plan

- **A plan covers up to 8 weeks.** With a goal date it runs until that date (at least 2 weeks);
  without one, 8 weeks. Extending a finished plan comes with the weekly check-in (phase 6).
- **One AI call writes the outline**: modules, a goal per week, and short lessons (title, objective,
  minutes, kind). The longer lesson content (explanation, exercise, resource links) is written when
  a lesson is first opened (phase 5), which keeps each AI call well under the 60-second limit.
- **The AI proposes, the server disposes.** Beyond the schema, the API checks that the plan has the
  right number of weeks and that each week fits the learner's hours (within 40% either way); a
  plan that does not fit gets the problems back for repair. Dates are never chosen by the AI: pure
  domain code spreads each week's lessons over the learner's preferred days, lightest day first.
- **Moving a lesson** is allowed to any day from today to the end of the plan; the lesson keeps its
  place in its week's curriculum. Phones get a "Move to" date picker; desktops can also drag.
- **"Regenerate this week"** replaces that week's unfinished lessons and keeps finished ones.
  "Easier" and "Harder" shift the plan's difficulty one step (within two steps either way) and
  regenerate the week at the new difficulty.
- **The demo plan** is hand-written (no AI), starts three weeks ago, and has the first two weeks
  done and the third in progress.

## Phase 5: daily use

- **Lesson content is written on first open** (explanation, one exercise, 1 to 3 resources) and
  stored, so each lesson costs one AI request once.
- **Resource links are checked before anyone sees them.** AI models invent URLs, so a link is kept
  only if it is `https` on a short list of well-known free learning sites (Wikipedia, Khan Academy,
  MDN, freeCodeCamp, YouTube, BBC, and a few others). If no link survives, the lesson gets a
  Wikipedia search and a YouTube search for its topic instead. No third-party content is copied.
- **Explanations are shown as plain paragraphs**, never as HTML, so AI output cannot inject markup.
- **The streak** counts consecutive days with at least one finished lesson or review, up to today;
  if today has nothing yet, the streak still counts through yesterday. "Today" is the learner's
  own calendar date, sent by the browser (within a day of the server's UTC date).
- **The tutor** answers in the context of the lesson, the learner's level and their last
  conversation turns; each message is one AI request. It keeps the last 20 messages per lesson and
  declines unrelated requests.
- **Missed lessons** (scheduled before today, not done) show on Today as "Catch up" until phase 6
  reschedules them automatically.
- **Module quizzes** have 5 multiple choice questions written by the AI from the module's lessons.
  They can be taken any time (the roadmap suggests it once every lesson in the module is done);
  retaking replaces the previous score. Answer keys stay on the server until the quiz is submitted.
- **Wrong answers go to the review queue** with the correct answer and a short explanation. The
  queue uses Leitner boxes: a right answer moves a card up a box (next review in 1, 3, 7, 14, then
  30 days), a wrong answer sends it back to box one (tomorrow). Reviews count toward the streak.
- **Review cards are readable by their owner** (they hold the answer). That is fine: the learner has
  already seen it in the quiz results, and reviews are practice, not a graded test.

## Phase 6: check-ins and rescheduling

- **Missed lessons move automatically** when the learner opens the app: every unfinished lesson
  dated before today goes to the lightest of their preferred days in the next two weeks (within
  the plan). The plan keeps a note of what moved, and Today shows it that day, so the change is
  explained, never silent.
- **The weekly check-in** asks what went well, what was hard, and how the pace felt. The AI then
  rewrites the following week and explains the change in a few sentences; "too easy" and "too
  hard" shift the plan's difficulty by one step. A check-in is offered for the current week from
  its fourth day, or for last week if it was skipped; each week is checked in once.

## Phase 7: progress

- **Badges are computed, not stored**, by pure domain rules from the learner's activity and plans:
  first lesson, first full week, first module quiz, 7-day streak and 30-day streak. They can never
  drift out of sync with what actually happened.
- **The PDF summary uses the browser's own "Save as PDF"** on a print-ready certificate view,
  instead of a PDF library: no extra bundle weight, and it works in every modern browser. It is
  labeled "Self-issued progress summary, not an official certificate" on the page and in print.
- **The radar compares against the starting point once there is something to compare**: the
  placement result is the start; per-sub-skill progress tracking arrives with retakes, so until
  then the dashboard shows the starting radar next to module quiz scores over time.

## Phase 8: settings and limits (first part)

- **Deleting an account erases everything the user owns**: their whole `users/{uid}` tree (profile,
  skills, plans, lessons, activity, reviews, quiz results, check-ins) and their server-only answer
  keys, then the sign-in account itself. The browser deletes the sign-in account (Firebase may ask
  Google users to sign in again first), so the API needs no extra admin permissions.
- **The usage meter** shows today's AI requests against the daily allowance and when it resets.
- **A failed AI call is not counted.** The request is counted before the call (so limits hold under
  concurrency) and given back if every provider fails.

## Phase 8: plans and billing

- **Free** has 1 skill and 20 AI requests a day; **Pro** has unlimited skills and 100 AI requests a
  day, for 5 USD a month. "Active skill" means any skill on the account, since there is no archive
  yet; a learner on Free who wants another skill upgrades (removing a skill can come later).
- **Demo accounts are on Free but may hold up to 3 skills**, so a reviewer can try onboarding, the
  placement test and plan creation on top of the seeded Spanish skill. They can also try the whole
  test-mode checkout with Stripe's test card.
- **Checkout is Stripe-hosted, test mode only, monthly.** Cancelling ends Pro at once (no
  end-of-period grace), which keeps the demo simple to try again. See ADR 0007.
- **Reminders are in the app only.** "Notification preferences" switch Today's reminders for due
  check-ins and review cards on or off; Darb sends no email or push notifications.
- **Demo accounts are erased a week after they were started** by a daily scheduled call: their data,
  any test subscription, then the anonymous sign-in. If the sign-in cannot be deleted, it holds no
  data and simply gets a fresh demo if used again.

## Phase 9: Arabic, accessibility and responsiveness

- **Language** is remembered per device and starts from the browser's language. Signed-in learners'
  profiles follow the app's language, and **the AI writes new content in it** (plans, lessons,
  tutor replies, check-ins). Tests are bilingual and the rest is translated on demand (see "After
  the first live test"). The demo's tests are seeded in both languages, its plan in English.
- **Arabic uses Western digits** (as in the translations) and Modern Standard Arabic, addressing the
  learner in the masculine generic form. Charts mirror their time axis in right-to-left layout.
- **Accessibility is checked automatically**: Playwright runs axe (WCAG 2.2 A and AA) on every main
  page in both languages. Charts are hidden from assistive technology because a text list next to
  each carries the same data.

## Phase 10: documentation

- The README GIF and screenshots are captured from the local app with the deterministic fake AI
  (`pnpm screenshots`), so they can be regenerated at any time without an AI key.

## After the first live test

- **"I don't know yet"** is offered on every placement question. It counts as a miss (no credit,
  and two misses in a row can end the test early), so the level reflects what the learner knows
  rather than lucky guesses. The test stays a test: no hints or explanations until it is finished.
- **Tests are written in English and Arabic at once.** Placement tests, their review summary and
  sub-skill names, module quizzes and the review cards they create come from one AI call that
  writes every learner-facing text in both languages, so switching language, even mid-test,
  changes the question and its options on the spot and keeps the chosen answer. Scoring uses the
  English sub-skill names; short answers can be written in either language.
- **Plans and lessons are written in one language and translated on demand.** They are long, so
  writing both versions up front would roughly double their AI cost and wait. Each module, week
  and lesson remembers the language it was written in (a week rewritten after switching can
  differ from the rest of the plan). Viewing it in the other language translates only those texts,
  in batches of 40 run together, counted as one AI request; each translation is stored per user,
  so it happens once. Tutor replies are translated too; the learner's own messages never are.
  If translating fails, the original text is shown with a retry link.
- **Not translated:** the check-in explanation (shown once, in the language it was asked in), quiz
  titles on the progress chart, and the curated community list.
- **Content from before this change:** plain single-language texts already stored (the placement
  summary, review cards, quiz results) are shown as they are in both languages. Plans and lessons
  without a language tag count as English. A placement test or module quiz that was in progress
  in one language starts again as a bilingual one.
