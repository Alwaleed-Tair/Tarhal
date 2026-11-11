# AI chat — token cost (for the SDD)

Measured with `npm run ai:eval` (18 typical questions, one question per conversation, model `deepseek-flash`):

| Metric | Value |
|---|---|
| Average input per question | 939 tokens |
| Average output per question | 265 tokens (cap now 1,500; measured before the cap was raised) |
| Of the input, the fixed system prompt | about 830 tokens |
| A flight question (tool call = 2 model calls) | about 1,780 input / 200 output |

**Estimate for a 6-question conversation** (history is re-sent each turn, ~300 tokens per turn):
input ≈ 6 × 830 + 300 × (0+1+2+3+4+5) ≈ 9,500 tokens, output ≈ 6 × 265 ≈ 1,600 tokens.

The destination guide and the itinerary (`/api/ai/guide`, `/api/ai/itinerary`) have not been measured yet: the local
setup used for this update has no `DEEPSEEK_API_KEY`, so they were tested with a mocked model only. Their output caps are below.

**Cost formula:** `cost = input_tokens × price_in / 1,000,000 + output_tokens × price_out / 1,000,000`.

**Prices: not filled in.** The model in use (`deepseek-flash`, or `TARHAL_MODEL_FLASH`) has to be matched to the provider's
current price list (USD per 1M input and output tokens, with and without cache hits). No documented price was checked for
this page, so none is written here. Copy them from the DeepSeek pricing page on the day you fill this in and write that
date next to them, or run `PRICE_IN_PER_M=<usd> PRICE_OUT_PER_M=<usd> npm run ai:eval` to get dollars per question.

## Limits (what keeps the cost bounded)

| Limit | Value | Where |
|---|---|---|
| Message length | 1,000 characters (`TARHAL_CHAT_MAX_MESSAGE_CHARS`) | lib/ai/prompt.ts |
| History sent | last 24 messages (`TARHAL_MAX_HISTORY_TURNS` × 2) | lib/ai/prompt.ts |
| Chat output | 1,500 tokens (`TARHAL_CHAT_MAX_TOKENS`), at most 4 model steps | lib/ai/prompt.ts, app/api/ai/chat/route.ts |
| Destination guide output | 900 tokens; the same city and language reuse the last answer for 1 hour | lib/ai/guides.ts |
| Itinerary output | 1,600 tokens; 1 to 7 days, up to 5 interests | lib/ai/guides.ts |
| Requests per person | 30 per 10 minutes when logged in, 10 per 10 minutes for guests (by IP), shared by chat, guide and itinerary; then **429** with `Retry-After` | lib/ai/limits.ts (`TARHAL_AI_LIMIT_USER`, `TARHAL_AI_LIMIT_GUEST`, `TARHAL_AI_LIMIT_WINDOW_MS`) |
| Time per request | 30 seconds, then 504 with a friendly message (`TARHAL_AI_TIMEOUT_MS`) | lib/ai/limits.ts |

The request counts are kept **in memory**, because the schema has no table for AI usage and the schema was not changed.
Each server instance (each Netlify function instance) counts on its own, and the counts reset on restart. Keeping usage per
user over time would need a new table and a migration.

## Usage log

Every AI request writes one line with token counts only (no message text, no user id, no IP):

```
[ai] usage {"route":"chat","who":"guest","inputTokens":939,"outputTokens":265,"totalTokens":1204,"ms":2310,"tools":1,"truncated":false}
```

Add up `inputTokens` and `outputTokens` from the server logs (Netlify function logs) and apply the formula above.
