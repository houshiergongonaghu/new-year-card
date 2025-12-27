# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个基于 Web 的节日贺卡生成器 MVP。用户上传个人照片后，系统使用 AI 将其重绘为手绘水彩风格插画，用户可添加祝福语并通过邮件发送给朋友。

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React
- **Styling**: Tailwind CSS, Lucide React (icons)
- **Fonts**: Google Fonts (Great Vibes/Caveat for handwritten text, Inter for UI); current UI uses Playfair Display + Geist (from v0)
- **Backend**: Supabase (Postgres + Storage)
- **AI**: Replicate API (img2img model; version configured in `app/api/generate/route.ts`)
- **Email**: Resend (using test domain `onboarding@resend.dev` for Phase 6)

## Database Schema

**Table: cards**
- `id`: UUID (Primary Key, default: gen_random_uuid())
- `image_url`: Text - Supabase Storage 中的完整图片链接
- `sender_name`: Text - 发送人昵称
- `recipient_name`: Text - 收件人昵称
- `message`: Text - 祝福语内容
- `created_at`: Timestamptz - default: now()

**Table: generation_logs**
- `id`: UUID (Primary Key, default: gen_random_uuid())
- `ip`: Text - generation request IP
- `created_at`: Timestamptz - default: now()

## Key Features Implementation

1. **AI Image Generation**: Replicate API with IP rate limiting (2 generations per IP per 24 hours)
2. **Canvas Synthesis**: Frontend canvas drawing with Great Vibes/Caveat fonts for handwritten effect
3. **Storage**: Supabase Storage bucket "cards" for uploaded images
4. **Email Delivery**: Resend API with personalized viewing links (/card/[id])
5. **Viral CTA**: "我也要做一张" button on viewing pages linking back to homepage

## Email Configuration

**Resend Test Domain (Phase 6)**: Using `onboarding@resend.dev` to bypass domain verification.

**Production Options**:
- Option B: Verify your own domain at https://resend.com/domains
- Option C: Purchase a domain from Resend

## Repo Notes (Current)

- Project root is `D:\cursor\shengdanheka` with App Router at `app/` (no `src/`).
- `.env.local` lives at repo root.
- `public/` contains images/icons referenced by `app/page.tsx` and `app/layout.tsx`.
- The five hero JPGs in `public/` are temporary duplicates of `image/images.jfif`.
- `setup.sql` includes the DDL for `generation_logs` (rate-limit table).
- There is no `shengdanheka-app` subproject; the root is the active app.

## AI Generation (Current State)

- API route: `app/api/generate/route.ts` (multipart form upload -> data URL -> Replicate).
- Rate limit uses `generation_logs` (2 per IP per 24 hours).
- Mock mode: set `MOCK_AI=1` to bypass Replicate and return a local image URL.
- Known gap: does not yet upload user image to Supabase before Replicate, nor re-upload the generated image to Supabase.
- Replicate requires paid credits; without credit the API can return 402.
- Model version and input fields are hardcoded in `app/api/generate/route.ts`.

## Work Log (Recent)

- Merged v0 UI into the root app (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/`, `lib/`, `public/`).
- Added `/api/generate` route with Supabase rate limiting + logging; wired mock mode for testing.
- Installed `@supabase/supabase-js` and stored Supabase/Replicate env vars in `.env.local`.
- Added placeholder public assets and icons required by the UI.
- Added `generation_logs` table/index in Supabase and stored the SQL in `setup.sql`.
- **Phase 6 Complete**: Implemented `/api/save/card` and `/api/send/email` APIs with Resend integration. Used `onboarding@resend.dev` test domain (方案A) to bypass domain verification requirement.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
REPLICATE_API_TOKEN=
RESEND_API_KEY=
MOCK_AI=
```

## Design Requirements

- **Colors**: 粉紫色渐变 (Gradient Pink/Purple) background
- **Typography**: 全站标题使用衬线体 (Serif), 贺卡文字使用 Google Font Great Vibes/Caveat
- **Responsive**: 移动端优先，桌面端左侧预览右侧表单，移动端上下布局
