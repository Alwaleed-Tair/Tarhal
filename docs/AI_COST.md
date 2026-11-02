# AI chat — token cost (for the SDD)

Measured with `npm run ai:eval` (18 typical questions, one question per conversation, model `deepseek-flash`):

| Metric | Value |
|---|---|
| Average input per question | 939 tokens |
| Average output per question | 265 tokens (cap: 700) |
| Of the input, the fixed system prompt | about 830 tokens |
| A flight question (tool call = 2 model calls) | about 1,780 input / 200 output |

**Estimate for a 6-question conversation** (history is re-sent each turn, ~300 tokens per turn):
input ≈ 6 × 830 + 300 × (0+1+2+3+4+5) ≈ 9,500 tokens, output ≈ 6 × 265 ≈ 1,600 tokens.

**Cost formula:** `cost = input_tokens × price_in / 1,000,000 + output_tokens × price_out / 1,000,000`.
Fill in the current DeepSeek price per 1M tokens (check the provider's pricing page; not recorded here) or run
`PRICE_IN_PER_M=<usd> PRICE_OUT_PER_M=<usd> npm run ai:eval` to get dollars per question.

**Bounds:** max 1,000 characters per message, last 24 messages sent, max 700 output tokens, max 3 model steps per request.
So the worst case per request is bounded; per-user rate limiting is not implemented yet.
