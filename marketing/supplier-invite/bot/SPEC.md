# WhatsApp invite bot

**Status (2026-10-17): built and deployed, inactive until the owner adds the WhatsApp and Anthropic secrets.**

Every shop that answers the owner's WhatsApp invitation gets an answer within seconds, day or night. **Nobody on the team answers by hand** (owner decision). Fixed texts cover the language choice (2 / 3) and media. Claude Haiku 5.5 answers everything else in the voice of a friendly team member, under a hard cap of **$5 per month** (owner decision).

The owner sends invitations **by hand** from the WhatsApp Business app. The bot only **replies**, inside the 24-hour window the shop opened. These are service messages, free under Meta's pricing ([Meta pricing](https://developers.facebook.com/docs/whatsapp/pricing)).

## Pieces
| Where | What |
| --- | --- |
| `marketing/supplier-invite/bot/replies.mjs` | `decide()`: fixed answers, or `ai: true`. Source of truth. |
| `marketing/supplier-invite/bot/ai.mjs` | `askClaude()`: `claude-haiku-5-5`, thinking off, `max_tokens` 300, last 10 turns of history, JSON `{ reply, intent }`, `costUsd()`. |
| `marketing/supplier-invite/bot/texts.json` | Fixed texts (ar/en/ur). Built by `build-bot-texts.js`, which also copies the three bot files into the edge function. |
| `marketing/supplier-invite/bot/replies.test.mjs` | 19 checks of the fixed part, with no API calls. |
| `supabase/functions/whatsapp-invite-bot/` | The webhook (deployed, `verify_jwt=false`, HMAC signature check). |
| Migration 165 | `invite_chats`, `invite_messages`: RLS on, service-role writes, admin read. |
| Migration 166 | `paused` stage, and `invite_ai_tokens_month()` for the cap. |
| `/admin/invites` | Read-only list with transcripts and this month's AI cost. |
| `public/invite/assets/poster-{ar,en,ur}.png` | Posters the bot sends by link. |

## Behaviour
- Only chats opened by the owner's invitation (or follow-up) get answers. Never-invited numbers are ignored.
- 2 / 3 (also ٢ ٣, «English», «اردو»): fixed details plus the poster in that language.
- Voice notes and images get «please type your question».
- Anything else, including «yes», goes to the AI. The AI's intent sets the stage to interested or declined.
- **Rare escalation (migration 167):** for a big deal, an important party (large company, government, investor, press), a serious complaint, or a problem the AI cannot solve, it tells the shop the person in charge will reply here, sets `escalated`, and notifies every admin with the reason. The bot is silent in that chat for 24 hours, then resumes if the owner has not written. If the owner writes, the chat becomes `paused`.
- If the owner types in a chat himself, the stage becomes `paused` and the bot stays silent there.
- **Cap.** Every AI call logs its tokens. Before each call the month's cost (Riyadh calendar month) is summed. At $5 (`AI_CAP_USD`), the fixed texts answer and every admin gets one notification that month.
- If the AI fails or refuses, a fixed fallback line is sent. The tokens still count toward the cap.

## Cost
Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens. A reply is about 1,600 input + 150 output tokens, so about $0.0002. **$5 covers roughly 20,000 replies a month.** Real cost shows on `/admin/invites`.

## To go live (owner)
1. Put a real number on the WhatsApp Business app, then connect it to the Cloud API through Embedded Signup with the **coexistence** option. Requirements reported by providers ([Telnyx](https://developers.telnyx.com/docs/messaging/whatsapp/coexistence), [8x8](https://developer.8x8.com/connect/docs/whatsapp/whatsapp-business-app-coexistence)): app 2.24.17+, admin on the Meta business portfolio.
2. In Meta, set the webhook URL to `https://svswlsnsfhxelslbysvz.supabase.co/functions/v1/whatsapp-invite-bot`. Subscribe to `messages` and `smb_message_echoes`.
3. Add the Supabase function secrets: `WA_INVITE_TOKEN`, `WA_INVITE_PHONE_NUMBER_ID`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `ANTHROPIC_API_KEY`. Optional: `AI_CAP_USD` (default 5), `INVITE_BASE_URL` (default https://Taseerak.com).
4. Connect Taseerak.com: links and poster URLs in replies use it.
5. Test with a second phone. Answer `2`, `نعم`, `كم العمولة؟`, a voice note, `لا مو مهتم`, then type yourself in the chat. Expected: English details + poster; a welcome; an MSA answer; «please type»; a polite line; then silence.

## Unverified until a real number is connected
The echo webhook field (`smb_message_echoes`) and its payload shape are from provider documentation. Check the first real echo in the function logs and adjust `onOwnerEcho` if needed.
