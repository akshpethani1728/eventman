# EventMan — Event Manpower Management

A full-stack web platform connecting event organizers with workers in Ahmedabad. Built with **Next.js 15**, **Supabase**, and **Razorpay**.

## Features

### For Workers
- Browse and search events by category, location, and pay
- Apply to events with one tap
- Track application status (pending / approved / rejected)
- Build a trusted worker profile with skills, experience, and reviews
- 10-day free trial subscription; paid monthly plan to keep applying
- Payment history and plan management

### For Organizers
- Create and manage events with detailed requirements
- Review worker profiles and approve/reject applicants
- Track manpower fill status in real time
- Access worker database to find candidates by skills and location
- Export applicant data as CSV

### General
- Phone OTP authentication via Supabase Auth
- Role-based routing (worker / organizer / admin)
- Admin panel for managing users and all events
- PWA support — installable, works offline for cached routes
- Real-time notifications for application status changes
- Push notification-ready service worker

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Authentication | Supabase Auth (SSR, PKCE flow) |
| Database | Supabase PostgreSQL |
| Payments | Razorpay (orders, payments, webhooks) |
| Hosting | Vercel |
| PWA | Service worker + Web manifest |

## Project Structure

```
eventman/
├── public/                         # Static assets
│   ├── favicon.svg
│   ├── apple-icon.svg
│   ├── manifest.json               # PWA manifest
│   └── sw.js                       # Service worker
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── admin/page.tsx          # Admin dashboard
│   │   ├── login/page.tsx          # Auth (sign in / sign up / OTP)
│   │   ├── organizer/              # Organizer routes
│   │   │   ├── layout.tsx          # Bottom nav layout
│   │   │   ├── dashboard/          # Main organizer dashboard
│   │   │   ├── database/           # Worker database browser
│   │   │   ├── events/[id]/        # Event detail + applicants
│   │   │   ├── notifications/      # Notification list
│   │   │   └── profile/            # Organizer profile
│   │   ├── worker/                 # Worker routes
│   │   │   ├── layout.tsx          # Bottom nav layout
│   │   │   ├── dashboard/          # Event feed + status
│   │   │   ├── events/[id]/        # Event detail + apply
│   │   │   ├── notifications/      # Notification list
│   │   │   ├── plans/              # Subscription plans + payment history
│   │   │   └── profile/            # Worker profile
│   │   ├── api/razorpay/           # Payment API routes
│   │   │   ├── create-order/       # POST — create Razorpay order
│   │   │   ├── verify-payment/     # POST — verify payment signature
│   │   │   └── webhook/            # POST — receive Razorpay webhooks
│   │   ├── privacy/page.tsx
│   │   ├── refund-policy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── globals.css             # Tailwind + design tokens
│   │   ├── layout.tsx              # Root layout (metadata, fonts, PWA)
│   │   ├── error.tsx               # Global error boundary
│   │   └── global-error.tsx
│   ├── middleware.ts               # Supabase session refresh
│   ├── components/
│   │   ├── LegalPageShell.tsx       # Layout wrapper for legal pages
│   │   ├── Logo.tsx                 # Brand logo component
│   │   └── PWA.tsx                  # PWA registration, offline banner, install prompt
│   └── lib/
│       ├── utils.ts                 # cn() helper (clsx + tailwind-merge)
│       ├── useDebounce.ts          # Generic debounce hook
│       ├── useFocusTrap.ts         # Focus trap for modals
│       ├── useStableForm.ts        # Stable form state + scroll lock
│       ├── subscription.ts         # Plan status checker
│       ├── design/                  # Design system
│       │   ├── tokens.ts           # Colors, shadows, radii, typography
│       │   ├── Button.tsx          # Button + IconButton
│       │   ├── Card.tsx            # Card, CardHeader, CardStats
│       │   ├── Badge.tsx           # Badge, StatusDot, Divider
│       │   ├── Modal.tsx           # Modal + ConfirmDialog
│       │   ├── Loading.tsx         # Spinner, PageLoader, SkeletonBlock
│       │   ├── ErrorBoundary.tsx   # React error boundary
│       │   └── index.ts            # Re-exports
│       ├── organizer/
│       │   ├── constants.ts        # Profile checkers, availability configs
│       │   └── applicantUtils.ts   # Applicant load/update/remove
│       └── supabase/
│           ├── client.ts           # Browser Supabase client
│           ├── server.ts           # Server-side Supabase client
│           ├── middleware.ts       # Middleware session handler
│           ├── actions.ts          # Server actions (auth, profile)
│           └── types.ts            # TypeScript types for all tables
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

## Database Schema

### Tables

**profiles** — Users (workers, organizers, admins)
- `user_id` (UUID, PK, FK → auth.users)
- `role`: worker | organizer | admin
- `full_name`, `email`, `phone`, `age`, `gender`, `city`, `area`
- `skills`, `experience`, `availability`, `bio`
- `status`: unverified | basic_verified | trusted
- `plan_status`: trial | active | expired
- `trial_start_date`, `trial_end_date`
- `subscription_start_date`, `subscription_end_date`
- `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`

**events** — Events posted by organizers
- `organizer_id` (UUID, FK → profiles)
- `title`, `location`, `date`, `time`, `end_time`
- `worker_count`, `gender_requirement`, `min_age`, `max_age`
- `category`, `dress_code`, `required_documents`
- `status`: draft | published | filling | full | closed | completed | cancelled
- Many optional detail fields (work_description, skill_requirements, etc.)

**applications** — Worker applications to events
- `event_id` (UUID, FK → events)
- `worker_id` (UUID, FK → profiles)
- `status`: pending | approved | rejected | cancelled

**subscriptions** — Subscription periods (trial + paid)
- `worker_id` (UUID, FK → auth.users)
- `status`: trial | active | expired | cancelled
- `plan_name`, `amount`, `start_date`, `end_date`
- `payment_id`, `order_id`

**payments** — Payment audit trail
- `worker_id` (UUID, FK → auth.users)
- `payment_id` (TEXT, UNIQUE)
- `amount`, `gateway`, `status`, `payment_date`
- `raw_payload` (JSONB)

**documents** — User-uploaded verification documents
- `type`: aadhaar | driving_license | photo | other
- `url`, `verified`

**reviews** — Worker/organizer ratings
- `from_id`, `to_id`, `event_id`
- `rating` (1-5), `comment`

**notifications** — In-app notifications
- `title`, `message`, `read`

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase (replace with your own project values from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Razorpay (replace with your own keys from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Payment & Subscription Flow

1. Workers sign up and receive a **10-day free trial**
2. After trial expires, they must subscribe to continue applying
3. Subscription costs a flat monthly fee, processed via **Razorpay**
4. Payment is verified server-side via webhook (`payment.captured` event)
5. On successful payment, a 30-day active subscription is created
6. Razorpay webhook uses signature verification (`x-razorpay-signature`)
7. Workers can view payment history and plan status on `/worker/plans`

## Authentication Flow

- Users sign up with email + password
- OTP verification via email link
- On first login, profile creation step (name + role selection)
- Worker role: trial subscription created automatically
- Organizer role: no subscription required
- Session managed via Supabase SSR cookies (persisted up to 400 days)
- Middleware refreshes session on every request

## Deployment

The app is deployed on Vercel at [eventman2.vercel.app](https://eventman2.vercel.app).

### Vercel Environment Variables

Set these in the Vercel dashboard (or using `vercel env add`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

### Razorpay Webhook Configuration

- **URL**: `https://eventman2.vercel.app/api/razorpay/webhook`
- **Events**: `payment.captured`

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/razorpay/create-order` | POST | Server action | Creates a Razorpay order |
| `/api/razorpay/verify-payment` | POST | Server action | Verifies payment, activates subscription |
| `/api/razorpay/webhook` | POST | Webhook | Handles Razorpay payment.captured events |

## Design System

The app uses a custom design system defined in `src/lib/design/tokens.ts`:

- **Brand color**: Teal (`#0D94888`)
- **Surface**: Warm off-white (`#F8F8F6`)
- **Cards**: White with subtle shadows
- **Radiuses**: 10px / 16px / 20px / 24px
- **Typography**: Inter font, 7 levels from display to caption
- **Shadows**: 7 levels from subtle to floating
- **Badges**: 20+ semantic color variants for status labels

## Notes

- The app targets the Ahmedabad, Gujarat market with Gujarati-language locale (`lang="gu"`)
- Database is IPv6-only on Supabase's new API gateway
- Organizers never pay; only workers have a subscription model
- All payments are idempotent — duplicate webhook events are ignored via `payment_id` uniqueness
