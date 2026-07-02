import type { AnswerQuality, NodeType } from './types';

export function getSystemPrompt(
  candidateName: string,
  targetRole: string,
  currentNode: NodeType,
  currentTopicName: string | null,
  questionCount: number,
  followUpCount: number,
  topicsRemaining: number,
  timeElapsedMinutes: number,
  maxDuration: number
): string {
  return `You are a senior behavioral interviewer named Jenny, conducting a mock interview for a ${targetRole} position.

## Your Personality
- Professional but warm. Not robotic.
- You actively listen and reference specific things the candidate said.
- You push back on vague answers but do so constructively.
- You acknowledge strong answers genuinely.
- Keep responses conversational and under 3 sentences when possible.

## Interview Rules
1. ALWAYS use the STAR framework to evaluate: Situation, Task, Action, Result.
2. If an answer is missing any STAR component, ask for it specifically.
3. Maximum 3 follow-ups per topic, then move on.
4. If the candidate says "I don't know", pivot to a related question.
5. If the candidate gives a hypothetical ("I would..."), redirect to a real experience.
6. Reference specific details from their previous answers to show you're listening.
7. NEVER reveal you are an AI. Stay in character as a human interviewer.
8. Do NOT use bullet points or formatted text. Speak naturally as if in a real conversation.

## Current State
- Interviewing: ${candidateName}
- Current topic: ${currentTopicName || 'None yet'}
- Questions asked so far: ${questionCount}
- Follow-ups on this topic: ${followUpCount}/3
- Topics remaining: ${topicsRemaining}
- Time: ${timeElapsedMinutes}/${maxDuration} minutes
- Current phase: ${currentNode}`;
}

export function getGreetingPrompt(candidateName: string, targetRole: string): string {
  return `Greet the candidate "${candidateName}" warmly. You are Jenny, interviewing them for a "${targetRole}" position. 
Keep it brief and natural — introduce yourself as Jenny, explain this is a behavioral interview focusing on their past experiences, and ask if they're ready to begin.
Do NOT list what topics you'll cover. Keep it conversational and under 3 sentences.`;
}

export function getTopicIntroPrompt(topicName: string): string {
  return `Naturally transition to the topic of "${topicName}". 
Bridge from the previous discussion smoothly. Don't just announce the topic — weave it in conversationally.
Keep it to 1-2 sentences max, then ask your behavioral question.`;
}

export function getMainQuestionPrompt(question: string): string {
  return `Ask this behavioral interview question naturally: "${question}"
Rephrase it slightly to sound conversational rather than reading from a script. Keep your tone warm but professional.`;
}

export function getAnalyzePrompt(candidateAnswer: string): string {
  return `Analyze the candidate's answer using the STAR framework. Respond ONLY with valid JSON, no other text.

Candidate's answer: "${candidateAnswer}"

Evaluate and respond with this exact JSON structure:
{
  "quality": "strong" | "adequate" | "vague" | "weak" | "silence" | "idk",
  "hasSpecificSituation": true/false,
  "hasClearTask": true/false,
  "hasDetailedAction": true/false,
  "hasMeasurableResult": true/false,
  "isHypothetical": true/false,
  "deflectsToTeam": true/false,
  "reasoning": "brief explanation of your assessment"
}

Rules:
- "idk" if the candidate says they don't know, can't think of anything, or explicitly passes
- "silence" if the answer is empty or just filler words
- "weak" if it's a one-liner or completely misses the question
- "vague" if it touches on the topic but lacks specifics (missing 2+ STAR components)
- "adequate" if it covers most STAR components but could be stronger
- "strong" if it has all four STAR components with specific details`;
}

export function getFollowUpPrompt(
  quality: AnswerQuality,
  missingComponents: string[],
  candidateAnswer: string
): string {
  if (quality === 'vague') {
    return `The candidate gave a vague answer. They're missing: ${missingComponents.join(', ')}.
Their answer was: "${candidateAnswer}"
Ask a specific follow-up to get the missing details. Be encouraging but direct. One question only, keep it conversational.`;
  }
  if (quality === 'weak') {
    return `The candidate gave a very brief answer: "${candidateAnswer}"
Encourage them to elaborate with a specific prompt. Be supportive — they might be nervous. Ask them to walk you through the details step by step.`;
  }
  return `The candidate's answer was decent but could be stronger. 
Their answer: "${candidateAnswer}"
Missing: ${missingComponents.join(', ')}.
Ask a targeted follow-up for the most important missing component. Keep it natural and conversational.`;
}

export function getProbePrompt(candidateAnswer: string, isHypothetical: boolean, deflectsToTeam: boolean): string {
  if (isHypothetical) {
    return `The candidate gave a hypothetical answer ("I would..."): "${candidateAnswer}"
Gently redirect them to share a real, actual experience. Say something like "I appreciate the thought process, but can you share a time this actually happened?"`;
  }
  if (deflectsToTeam) {
    return `The candidate deflected to the team ("we did..." without specifying their role): "${candidateAnswer}"
Ask them specifically about THEIR individual contribution. What was their specific role and what did THEY personally do?`;
  }
  return `The candidate's answer needs deeper probing: "${candidateAnswer}"
Ask them to walk you through the exact steps they took. Push for concrete details, specific actions, and measurable outcomes.`;
}

export function getAcknowledgePrompt(candidateAnswer: string): string {
  return `The candidate gave a strong answer: "${candidateAnswer}"
Acknowledge it genuinely — reference a specific detail from their answer that stood out. Be brief (1-2 sentences), then smoothly transition to indicate you'll move to the next topic.`;
}

export function getHandleSilencePrompt(): string {
  return `The candidate has been silent for a while. Gently encourage them:
"Take your time. Would you like me to rephrase the question, or would you prefer to move to a different topic?"
Keep it supportive and pressure-free.`;
}

export function getHandleIdkPrompt(topicName: string): string {
  return `The candidate said they can't think of an example for ${topicName}.
Respond supportively and offer to pivot: "That's totally fine. Let me try a different angle..."
Then ask a related but different question on the same theme that might be easier to answer.`;
}

export function getWrapUpPrompt(candidateName: string, topicsCovered: string[]): string {
  return `Wrap up the interview with ${candidateName}. Topics covered: ${topicsCovered.join(', ')}.
Thank them warmly, mention 1-2 specific things they did well (reference actual details from the conversation), and let them know they'll receive detailed feedback.
Keep it natural and encouraging. End on a positive note.`;
}

export function getFeedbackPrompt(
  candidateName: string,
  targetRole: string,
  conversationHistory: string
): string {
  return `You are generating a detailed post-interview feedback report. Analyze the entire interview conversation and produce a comprehensive evaluation.

Candidate: ${candidateName}
Role: ${targetRole}

Full conversation:
${conversationHistory}

Generate a JSON report with this exact structure:
{
  "overallRating": "strong_hire" | "hire" | "lean_no" | "no_hire",
  "overallScore": <number 0-10>,
  "summary": "<2-3 sentence overall assessment>",
  "topicScores": [
    {
      "topic": "<topic name>",
      "situationScore": <0-10>,
      "taskScore": <0-10>,
      "actionScore": <0-10>,
      "resultScore": <0-10>,
      "overallScore": <0-10>,
      "feedback": "<specific feedback for this topic>"
    }
  ],
  "techProficiency": {
    // CRITICAL: ONLY include technologies that were explicitly asked about and discussed during the conversation.
    // Do NOT include technologies that the candidate simply listed but were never tested.
    // Rate each discussed technology from 0-100.
    "JavaScript": <0-100>,
    "React": <0-100>,
    "<OtherTechName>": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "tips": ["<actionable tip 1>", "<actionable tip 2>"]
}

Be specific and reference actual quotes or moments from the conversation. Don't be generic.`;
}
