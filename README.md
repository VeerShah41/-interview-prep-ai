<div align="center">
  <img src="./assets/landing.png" alt="MentorQ Landing Page" width="800" />
  
  # MentorQ — AI Voice Mock Interview Platform

  **Practice behavioral interviews with an AI that actually listens, adapts, and pushes back.**

  [![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

---

## 📖 The "Why" (Product Thinking)

Most "AI interviews" on the market today are glorified text chatbots or rigid, scripted questionnaires. They fail to capture the nuances of a real conversation.

**MentorQ is built on a different premise:**
1. **Dynamic, not static:** The AI doesn't read from a hardcoded list. It evaluates your previous answer to determine its next move.
2. **Pushback:** If a candidate gives a vague "STAR" response, the AI will probe deeper ("Can you elaborate on what *specifically* you did in that situation?").
3. **Voice-only constraint:** Real interviews aren't done over text chat. Forcing a voice-only interface builds actual interview muscle memory.

## 🎥 Walkthrough & Demo

*Provide your Loom link here!*

[![Loom Video Walkthrough](https://img.shields.io/badge/Watch_Walkthrough-Loom-552586?style=for-the-badge&logo=loom)](https://loom.com/your-link-here)

In the video above, I cover:
1. My approach to the problem and architecture.
2. Key technical trade-offs.
3. A live, end-to-end demonstration of the core voice loop.

---

## 🚀 Quick Start (Local Setup)

Getting the project running locally takes **under 5 commands**:

```bash
# 1. Clone and enter the directory
git clone <your-repo-url> && cd mentorq

# 2. Setup environment variables (add your keys to .env)
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Initialize the database schema
npx prisma db push

# 5. Start the development server
npm run dev
```
*The app will be available at [http://localhost:3000](http://localhost:3000)*

---

## 🏗️ Architecture & Key Decisions

I chose to prioritize **depth and latency** over feature breadth, focusing entirely on making the core conversational loop feel natural.

<div align="center">
  <img src="./assets/dashboard.png" alt="MentorQ Dashboard" width="800" />
</div>

### The Interaction Loop
The hardest challenge was ensuring the AI knew *when* to ask a follow-up vs. *when* to move on to a new topic. 

```mermaid
graph TD;
    A[Candidate Speaks] -->|Speech-to-Text| B(API Route)
    B --> C{State Engine}
    C -->|Strong Answer| D[Acknowledge & Next Topic]
    C -->|Vague Answer| E[Generate Probe/Follow-up]
    C -->|Off-topic| F[Redirect Conversation]
    D --> G(LLM Generation)
    E --> G
    F --> G
    G -->|Text-to-Speech| H[Candidate Hears Response]
```

### Technical Trade-offs
- **Voice Stack**: Opted for the browser-native `Web Speech API` (SpeechRecognition & SpeechSynthesis). **Why?** It avoids the heavy latency (and cost) of streaming audio to a backend Whisper model, keeping the interaction loop snappy and realistic.
- **State Machine over LangChain**: Rather than relying on a heavy agent framework, I built a lightweight state machine. **Why?** It provides deterministic control over the interview flow while leaving the actual conversational *content* generation to the LLM.
- **Auth**: Built custom JWT authentication (using `jose`) from scratch. **Why?** It meets the assignment requirement of "simple JWT auth (no OAuth)" without relying on heavy external providers like Clerk or Auth0, showing full-stack capability.

---

## 🔑 Required Environment Variables

| Variable | Description | Cost |
|----------|-------------|------|
| `DATABASE_URL` | Your PostgreSQL connection string (e.g., [Neon](https://neon.tech)) | Free |
| `GROQ_API_KEY` | API key for Groq's ultra-fast LLM inference ([Console](https://console.groq.com)) | Free |
| `JWT_SECRET` | A secure, random 32+ character string for token signing | N/A |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Vanilla CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL with Prisma ORM
- **AI / LLM**: Groq (Llama 3) for near-instant inference
- **Voice**: Web Speech API (STT/TTS)
- **Auth**: Custom JWT

---

<div align="center">
  <i>Built as an engineering assignment for MentorQ.</i>
</div>
