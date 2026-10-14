# Personal Voice Delegate

## Status
Current live URL: https://personal-voice-delegate.vercel.app
The user approved deployment and provider data flow. The AI conversation backend and UI are deployed. Latest deployment: dpl_FbZxDCyrrTwoDCgbNyTkhwEUpTPt. Live normal conversation requests currently fail because AI Gateway returns HTTP 403 access denied; exact account remediation is not confirmed. The live server-side OTP guard returns HTTP 200. No successful live model response has occurred.

## What changed
- POST /api/conversation: server-side Vercel AI SDK 7.0.138 and AI Gateway.
- Model selected from the live model catalog: google/gemini-3.8-flash; override with AI_GATEWAY_MODEL.
- Structured responses include a spoken reply, intent, brief source fields, missing information, unverified outcome and suggested follow-up. Suggestions are not executed.
- Recent 24 turns and up to 4,000 characters of general owner context support visitors, work, events, appointments and deliveries.
- Instruction hierarchy, short voice-friendly responses, uncertain-transcript clarification and context-based follow-ups.
- Server-side validation, request bounds, short-circuit restricted/urgent/expired-brief handling, provider timeout and explicit provider error state.
- AI/offline selector, session consent checkbox, cancellation on restart/navigation and abortable requests. No silent downgrade from AI to offline mode.
- Offline regression fixes for capabilities, unclear TP transcript and repeat requests.

## Run and deploy
Use Node 24. `npm ci`, `npm test`, `npm run build`.
`npm run dev` runs the Vite frontend only; use offline practice there. Deploy the complete source including api/, server/, package-lock.json and vercel.json to Vercel for AI mode. A dist-only static deployment will not include the API.
Vercel project: prj_HcIxFnu8tjTgG8FMZcixBxTtwtvs.
Team: team_cCW8iML6vBwWU4bqhrQjFrEa.
OIDC has been enabled on the project. AI Gateway account verification and credits must still be verified. Do not put keys in client code. AI_GATEWAY_API_KEY is a server-only alternative to OIDC if needed.

## Data flow
After session consent, AI mode sends the active brief and recent caller/assistant text through a Vercel function to AI Gateway and the selected provider. Responses return to the browser; saved call history stays in localStorage. No server-side call database is connected. Browser speech recognition may use the browser vendor's service. Custom voice and real telephony are not connected.

## Limits before a public launch
This is a development demo, not production-ready. Client-provided briefs and history are not trusted identities. Add Supabase Auth, server-owned briefs and sessions, RLS storage, durable distributed usage quotas and account-level spending controls before opening paid model access to the general public. Current rate limits are per server instance and not a global billing cap. Prompt grounding does not guarantee all model responses are correct. Review adversarial and multi-language evaluations. No external calendar, messaging or booking actions are implemented.

## Verification
29 policy/server-contract tests pass and the production frontend build succeeds. Deployment is READY. Live model inference was attempted and blocked by provider HTTP 403. Real browser microphone behavior remains unverified. Error responses now distinguish account verification, credits, budget, authentication and generic provider-access denial without leaking raw provider errors.
