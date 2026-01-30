# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slack Bot application built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. The bot integrates with OpenAI API to provide AI-powered responses in Slack channels and direct messages.

## Quick Commands

### Development
- `pnpm dev` - Start development server (http://localhost:3000 with hot reload)
- `pnpm build` - Build for production (compiles Next.js, generates optimized bundle)
- `pnpm start` - Start production server (runs built app from previous build)
- `pnpm lint` - Run ESLint checks (uses Flat Config in eslint.config.mjs)

## Technology Stack

- **Framework:** Next.js 16.0.8 with App Router
- **UI Library:** React 19.2.1
- **Language:** TypeScript 5 (strict mode enabled)
- **Styling:** Tailwind CSS 4 with CSS variables for theming
- **Linting:** ESLint 9 with Flat Config
- **Package Manager:** pnpm (not npm/yarn/bun)
- **Slack Integration:** @slack/web-api 7.13.0
- **AI Integration:** openai 6.10.0 (GPT-4o-mini for cost efficiency)

## Project Architecture

### Directory Structure
- `app/` - Next.js App Router directory
  - `api/slack/events/route.ts` - Slack Events API endpoint (receives Slack events)
  - `layout.tsx` - Root layout with global metadata and Geist font configuration
  - `page.tsx` - Home page (default landing page)
  - `globals.css` - Global styles (Tailwind imports + CSS variable definitions)
- `lib/` - Utility functions and business logic
  - `openai-client.ts` - OpenAI API integration (GPT-4o-mini)
  - `slack-verification.ts` - Slack signature verification for security
- `.env.local` - Environment variables (not in git)
- `.env.example` - Environment variable template
- Root configuration files for TypeScript, Next.js, PostCSS, and ESLint

### Key Implementation Patterns

1. **Slack Bot Architecture:**
   - Slack Events API → Next.js API Route (`/api/slack/events`) → OpenAI API → Response to Slack
   - Supports `app_mention` (channel mentions) and `message.im` (direct messages)
   - Thread-aware responses (replies in threads when appropriate)
   - Bot ignores its own messages to prevent infinite loops

2. **Security Implementation:**
   - Slack signature verification using HMAC SHA256 with timing-safe comparison
   - 5-minute timestamp validation to prevent replay attacks
   - Environment variables for API keys (never hardcoded)
   - Type-safe request handling with TypeScript

3. **OpenAI Integration:**
   - Custom instructions via system messages (replicates GPTs behavior)
   - GPT-4o-mini model for cost efficiency (95% cheaper than GPT-4o)
   - Support for both single-turn and multi-turn conversations
   - Configurable temperature and max_tokens parameters

4. **Font Optimization:** Geist fonts (Sans & Mono) dynamically imported from Google Fonts and exposed as CSS variables
5. **Theming:** CSS variables (`--background`, `--foreground`) with dark mode support via `prefers-color-scheme`
6. **Path Aliases:** Use `@/*` for imports from the project root (configured in `tsconfig.json`)

### TypeScript Configuration

- **Strict Mode:** Enabled for full type safety
- **Module Resolution:** `bundler` (Next.js recommended)
- **JSX Transform:** `react-jsx` (automatic JSX compilation)
- **Target:** ES2017

### ESLint Setup

- Uses Flat Config format (`eslint.config.mjs`) with modern ESLint standard
- Includes Next.js Web Vitals and TypeScript support
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

### Styling with Tailwind CSS v4

- Uses new `@import "tailwindcss"` syntax (v4 specific)
- Theme configuration via `@theme inline` directive in `globals.css`
- Font variables integrated into Tailwind theme system
- Dark mode via CSS media query `prefers-color-scheme`

## Environment Variables

Required environment variables (see `.env.example`):

- `SLACK_SIGNING_SECRET` - Slack App signing secret for request verification
- `SLACK_BOT_TOKEN` - Slack Bot OAuth token (starts with `xoxb-`)
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini

## Customizing the Bot

### Changing AI Behavior

Edit `CUSTOM_INSTRUCTIONS` in `app/api/slack/events/route.ts`:

```typescript
const CUSTOM_INSTRUCTIONS = `Your custom instructions here`;
```

### Changing AI Model

Edit `model` parameter in `lib/openai-client.ts`:

```typescript
model: 'gpt-4o-mini', // Or 'gpt-4o', 'gpt-3.5-turbo', etc.
```

### Adjusting Response Parameters

Modify in `lib/openai-client.ts`:

- `temperature` - 0 (deterministic) to 2 (creative)
- `max_tokens` - Maximum response length

## Cost Optimization

- **Default model**: gpt-4o-mini (input: $0.15/1M tokens, output: $0.60/1M tokens)
- **Alternative**: gpt-3.5-turbo for even lower cost
- Estimate: ~$0.50/month for 1000 requests (500 tokens/request average)
