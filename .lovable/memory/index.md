# Project Memory

## Core
- Procurement & Harbor: AI command center for China-LatAm textile trade.
- Tech: React, TypeScript, Supabase, Claude API, Shadcn, Recharts.
- Dual UI: WhatsApp-style AI chat + manual dashboard. Must be 100% synced.
- UI/AI primary language is Spanish.
- NO silent AI changes; require explicit user approval. Audit logs mandatory.
- Sora (headings), DM Sans (body). Dark sidebar #0F1117, accent #00D084.
- All data tables need Excel/CSV export. Dashboard needs offline mode.
- Gamification: engagement principles only (progress, streaks-as-status, next-best-action, mastery). NO points, badges, leaderboards, confetti, celebratory animations. B2B professional tone.
- Shipment status → 'warehouse' triggers auto stock-in + writes landed_cost back to skus.cost_usd.
- Expired stock_reservations auto-released by pg_cron every 5 min.
- FX rates auto-synced daily 12:00 UTC from mindicador.cl (USD/EUR/CNY → CLP).
- Global ⌘K command palette + first-run onboarding tour are part of the standard shell.

## Memories
- [Project Identity](mem://project/identity)
- [Interface Philosophy](mem://product/interface-philosophy)
- [Visual Identity](mem://style/visual-identity)
- [Tech Stack](mem://tech/stack)
- [Localization Settings](mem://localization/language-setting)
- [System Rules & Constraints](mem://constraints/system-rules)
- [Module Scope](mem://features/module-scope)
- [Gamification approach](mem://design/gamification)
