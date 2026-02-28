# TikTok Integration Setup (OpenClaw)

Goal: Pull trend data reliably without using personal account scraping.

## Option A (recommended): TikTok Creative Center (public trend pages)

1. Open:
   - https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pad/en
   - https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pad/en
   - https://ads.tiktok.com/business/creativecenter/inspiration/popular/creator/pad/en
   - https://ads.tiktok.com/business/creativecenter/inspiration/popular/pad/en
2. Set region/time filters (ex: US, last 7 days).
3. Use OpenClaw browser automation or scripted fetch to capture top items.
4. Save snapshots to workspace files (e.g., `memory/tiktok-trends/current.md`).
5. Schedule daily with `openclaw cron add ...` for auto-refresh.

## Option B: Logged-in browser extraction (fallback)

1. Open TikTok pages in OpenClaw browser profile.
2. Log in with dedicated brand account (not personal).
3. Extract visible trend cards periodically.
4. Expect occasional breakage when TikTok UI changes.

## Important notes

- Don’t rely on consumer “For You” scraping for stable automation.
- Prefer dedicated business identity + read-only workflow.
- Keep it trend intelligence only (no risky automation behavior).

## Quick troubleshooting

- If no data shows: switch `pc/en` ↔ `pad/en`.
- If blocked: use OpenClaw browser tab (not raw HTTP fetch).
- If inconsistent: snapshot with stable selectors + retry window.
