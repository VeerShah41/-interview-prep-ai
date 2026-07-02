# MentorQ — AI Voice Mock Interview Platform

> Practice behavioral interviews with an AI that listens, adapts, and gives real-time feedback.

## Quick Start (Under 5 Commands)

```bash
git clone <your-repo-url> && cd mentorq
cp .env.example .env              # Then add your API keys (see below)
npm install
npx prisma db push                # Push schema to your PostgreSQL database
npm run dev                       # Opens at http://localhost:3000
```

## Required API Keys

| Key | Where to Get | Cost |
|-----|-------------|------|
| `DATABASE_URL` | [neon.tech](https://neon.tech) — Create a free PostgreSQL database | Free |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — Create an API key | Free |
| `JWT_SECRET` | Any random 32+ character string | N/A |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React, Vanilla CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon, serverless) |
| ORM | Prisma 6 |
| LLM | Groq (Llama 3.3 70B Versatile) |
| Voice (STT) | Web Speech API (browser-native, free) |
| Voice (TTS) | SpeechSynthesis API (browser-native, free) |
| Auth | JWT (jose library) |
| Conversation Engine | Custom state machine (LangGraph-inspired) |

## Architecture

```
Voice Loop:
Candidate speaks → Web Speech API (STT) → API Route → 
Conversation Engine (state machine) → Groq LLM → 
API Response → SpeechSynthesis (TTS) → Candidate hears

State Machine:
Greeting → Topic Intro → Question → Analyze Answer →
  ├── Strong → Acknowledge → Next Topic
  ├── Vague → Follow-Up (max 3) → Re-analyze
  ├── IDK → Pivot Question → Re-analyze
  └── Silence → Prompt → Re-analyze
→ Wrap Up → Generate Feedback
```

## Features

- **Voice-only interview**: No text chat — speak naturally like a real interview
- **Adaptive AI interviewer**: Follows up on vague answers, probes weak ones, acknowledges strong ones
- **STAR framework evaluation**: Situation, Task, Action, Result scoring per topic
- **Real-time transcript**: Live conversation transcript during interview
- **Post-interview feedback**: Detailed AI-generated report with strengths, improvements, and tips
- **Interview history**: Dashboard with past interviews and performance tracking
- **Edge case handling**: Silence detection, "I don't know" pivots, rambling interruption, hypothetical redirection

## Project Structure

```
mentorq/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── login/page.tsx              # Login
│   │   ├── signup/page.tsx             # Sign up
│   │   ├── dashboard/page.tsx          # Interview history + stats
│   │   ├── interview/
│   │   │   ├── setup/page.tsx          # Pre-interview mic check
│   │   │   └── live/page.tsx           # Live interview room (core)
│   │   ├── review/[id]/page.tsx        # Post-interview feedback
│   │   └── api/
│   │       ├── auth/                   # signup, login, me
│   │       ├── interview/              # start, respond, history
│   │       └── feedback/[id]/          # AI feedback generation
│   ├── lib/
│   │   ├── auth.ts                     # JWT utilities
│   │   ├── db.ts                       # Prisma client singleton
│   │   ├── hooks/                      # React hooks
│   │   │   ├── useAuth.tsx             # Auth context + provider
│   │   │   ├── useInterview.ts         # Interview state management
│   │   │   ├── useSpeechRecognition.ts # Web Speech API STT
│   │   │   └── useSpeechSynthesis.ts   # SpeechSynthesis TTS
│   │   └── services/
│   │       ├── llm.ts                  # Groq client + fallback
│   │       ├── topics.ts               # Behavioral topic pool
│   │       └── interview/
│   │           ├── engine.ts           # Conversation state machine
│   │           ├── prompts.ts          # Prompt engineering
│   │           └── types.ts            # TypeScript types
│   └── types/speech.d.ts              # Web Speech API types
└── prisma/schema.prisma               # Database schema
```

## Browser Support

| Browser | Voice STT | Voice TTS | Overall |
|---------|----------|----------|---------|
| Chrome | ✅ | ✅ | ✅ Full support |
| Edge | ✅ | ✅ | ✅ Full support |
| Safari | ⚠️ Partial | ✅ | ⚠️ Partial |
| Firefox | ❌ | ✅ | ❌ No STT |

> **Recommended**: Use Chrome or Edge for the best experience.

## License

MIT
