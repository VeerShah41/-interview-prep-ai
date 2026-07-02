import { generateResponse, type LLMMessage } from '../llm';
import { type InterviewGraphState, type ConversationMessage, type TopicState } from './types';

export function createInitialState(
  sessionId: string,
  candidateName: string,
  targetRole: string,
  techStack: string[],
  customApiKey?: string,
  difficultyLevel?: string
): InterviewGraphState & { customApiKey?: string; difficultyLevel?: string } {
  // 5 clear phases with generous limits so the interview never ends prematurely
  const phases: TopicState[] = [
    { id: 'p1', name: 'Tech Discovery', questions: [], followUpCount: 0, completed: false },
    { id: 'p2', name: 'Technical Questions', questions: [], followUpCount: 0, completed: false },
    { id: 'p3', name: 'Follow-up Deep Dive', questions: [], followUpCount: 0, completed: false },
    { id: 'p4', name: 'Project Experience', questions: [], followUpCount: 0, completed: false },
    { id: 'p5', name: 'Closing', questions: [], followUpCount: 0, completed: false }
  ];

  return {
    sessionId,
    candidateName,
    targetRole,
    techStack,
    startedAt: new Date().toISOString(),
    maxDurationMinutes: 30,
    messages: [],
    currentTopic: phases[0],
    topicsCovered: [],
    topicsRemaining: phases.slice(1),
    currentNode: 'greeting',
    questionCount: 0,
    lastAnswerQuality: null,
    lastCandidateAnswer: '',
    aiResponse: '',
    isComplete: false,
    customApiKey,
    difficultyLevel: difficultyLevel || 'intermediate',
  };
}

// How many candidate answers before we move to next phase
const PHASE_LIMITS: Record<string, number> = {
  p1: 2,   // Tech Discovery: 2 exchanges (what tech do you know + follow-up)
  p2: 4,   // Technical Questions: 4 questions (definitions, examples, scenarios)
  p3: 2,   // Follow-up Deep Dive: 2 follow-ups on keywords from their answers
  p4: 1,   // Project Experience: 1 question about projects/challenges
  p5: 1,   // Closing: 1 final positive exchange, then end
};

function getPhaseInstruction(state: InterviewGraphState & { difficultyLevel?: string }): string {
  const phaseId = state.currentTopic?.id || 'p5';
  const techStackStr = state.techStack.length > 0 ? state.techStack.join(', ') : 'not specified';
  const questionsAsked = state.currentTopic?.followUpCount || 0;
  const limit = PHASE_LIMITS[phaseId] || 1;

  switch (phaseId) {
    case 'p1':
      return `## YOUR TASK — Tech Discovery (question ${questionsAsked + 1} of ${limit})
The candidate's saved tech stack is: [${techStackStr}].
${questionsAsked === 0
  ? `Ask what technologies they have learned or used for the ${state.targetRole} role. Reference their saved tech stack if it exists. Example: "I see you've listed React and TypeScript — tell me about your experience with those and any other tech you use day-to-day for frontend work."`
  : `Based on their previous answer AND their saved tech stack, summarise the technologies they are comfortable with. Then pick ONE specific technology from the overlap and say you will focus on that for the next few questions. Example: "Great, so you're comfortable with React and hooks — let's dive into React a bit deeper."`
}`;

    case 'p2':
      return `## YOUR TASK — Technical Questions (question ${questionsAsked + 1} of ${limit})
Ask ONE clear, focused technical question about the technology chosen in the previous phase.
Keep questions small and specific: a definition, an example, a scenario, or an edge case.
Examples: "What is the difference between useMemo and useCallback?", "Can you explain what closures are with a quick example?", "What happens when you mutate state directly in React?"
DO NOT ask compound questions. ONE concept at a time.`;

    case 'p3':
      return `## YOUR TASK — Follow-up Deep Dive (question ${questionsAsked + 1} of ${limit})
Look at the candidate's previous answers. Pick a keyword or concept they mentioned and dig deeper.
If they mentioned something interesting, ask about it. If they were vague, probe further.
If there's nothing to follow up on, pick the next technology from their tech stack and ask a basic question about it.`;

    case 'p4':
      return `## YOUR TASK — Project Experience (question ${questionsAsked + 1} of ${limit})
Ask: "Have you used [the technology we discussed] in any of your projects? Tell me about the project, how you used it, and what challenges you faced."
Listen actively and ask a brief clarifying question if needed.`;

    case 'p5':
      return `## YOUR TASK — Closing
Give the candidate a brief, positive summary of how the interview went. Thank them warmly and say goodbye.
DO NOT ask any more questions. This is the final message.`;

    default:
      return 'Wrap up the interview warmly. Do not ask more questions.';
  }
}

function getSystemPrompt(state: InterviewGraphState & { difficultyLevel?: string }): string {
  const timeElapsed = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 60000);
  const difficulty = state.difficultyLevel || 'intermediate';

  let difficultyInstruction = '';
  if (difficulty === 'easy') {
    difficultyInstruction = 'Be lenient, friendly, and stick to basic-level questions.';
  } else if (difficulty === 'master') {
    difficultyInstruction = 'Be rigorous. Ask tough questions, probe edge cases, and push back on superficial answers.';
  } else {
    difficultyInstruction = 'Maintain standard professional interview rigor.';
  }

  const phaseInstruction = getPhaseInstruction(state);

  return `You are a senior technical interviewer named Jenny conducting a mock interview for a ${state.targetRole} position.
The candidate's name is ${state.candidateName}.

## Rules
- Professional but warm. Not robotic.
- Actively reference specific things the candidate said.
- NEVER reveal you are an AI.
- Keep responses SHORT — 2 to 4 sentences maximum.
- Ask exactly ONE question per response (unless closing).
- NEVER repeat a question you already asked.
- Difficulty: ${difficulty.toUpperCase()} — ${difficultyInstruction}

${phaseInstruction}

## Interview Progress
- Time elapsed: ${timeElapsed}/${state.maxDurationMinutes} minutes
- Total questions asked so far: ${state.questionCount}

Acknowledge the candidate's previous answer, then do exactly what YOUR TASK says.`;
}

function buildLLMMessages(state: InterviewGraphState): LLMMessage[] {
  const messages: LLMMessage[] = [{ role: 'system', content: getSystemPrompt(state) }];
  
  // Send full conversation history so the AI never loses context
  const recentMessages = state.messages.slice(-20);
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  return messages;
}

export async function startInterview(
  sessionId: string,
  candidateName: string,
  targetRole: string,
  techStack: string[],
  customApiKey?: string,
  difficultyLevel?: string
): Promise<InterviewGraphState> {
  const state = createInitialState(sessionId, candidateName, targetRole, techStack, customApiKey, difficultyLevel);
  
  const messages = buildLLMMessages(state);
  messages.push({
    role: 'user',
    content: `Introduce yourself as Jenny, welcome the candidate to the ${targetRole} interview, and ask the first Tech Discovery question: what technologies have they learned or used for this role? Reference their saved tech stack if it exists.`,
  });

  const response = await generateResponse(messages, 0, customApiKey);

  const aiMessage: ConversationMessage = {
    role: 'ai',
    content: response.content,
    nodeType: 'greeting',
    timestamp: new Date().toISOString(),
  };

  return {
    ...state,
    messages: [aiMessage],
    aiResponse: response.content,
    currentNode: 'main_question',
  };
}

export async function processResponse(
  state: InterviewGraphState & { customApiKey?: string; difficultyLevel?: string },
  candidateAnswer: string,
  customApiKey?: string
): Promise<InterviewGraphState> {
  const candidateMessage: ConversationMessage = {
    role: 'candidate',
    content: candidateAnswer,
    timestamp: new Date().toISOString(),
  };

  const updatedState = {
    ...state,
    messages: [...state.messages, candidateMessage],
    lastCandidateAnswer: candidateAnswer,
    // Deep-clone currentTopic so we don't mutate the original
    currentTopic: state.currentTopic ? { ...state.currentTopic } : null,
    topicsRemaining: state.topicsRemaining.map(t => ({ ...t })),
    topicsCovered: state.topicsCovered.map(t => ({ ...t })),
  };

  // Phase transition logic
  const currentPhase = updatedState.currentTopic;
  const previousPhaseId = currentPhase?.id;

  if (currentPhase) {
    currentPhase.followUpCount += 1;
    updatedState.questionCount += 1;

    const phaseLimit = PHASE_LIMITS[currentPhase.id] || 1;

    if (currentPhase.followUpCount >= phaseLimit) {
      if (updatedState.topicsRemaining.length > 0) {
        // Move to next phase
        updatedState.topicsCovered.push({ ...currentPhase, completed: true });
        updatedState.currentTopic = { ...updatedState.topicsRemaining[0] };
        updatedState.topicsRemaining = updatedState.topicsRemaining.slice(1);
      } else {
        // All phases done
        updatedState.isComplete = true;
      }
    }
  }

  // Only end on very explicit requests (not casual phrases)
  const answer = candidateAnswer.toLowerCase().trim();
  if (answer === 'end the interview' || answer === 'i want to stop' || answer === 'please end') {
    updatedState.isComplete = true;
  }

  // Check time limit
  const timeElapsed = (Date.now() - new Date(state.startedAt).getTime()) / 60000;
  if (timeElapsed >= state.maxDurationMinutes) {
    updatedState.isComplete = true;
  }

  // Build the transition prompt
  let prompt = '';
  if (updatedState.isComplete) {
    prompt = 'The interview is now over. Give a brief positive closing — thank the candidate, mention something specific they did well, and say goodbye warmly. Do NOT ask any more questions.';
  } else if (previousPhaseId && updatedState.currentTopic && previousPhaseId !== updatedState.currentTopic.id) {
    prompt = `You have finished the "${currentPhase?.name}" phase. Smoothly transition to the next phase: "${updatedState.currentTopic.name}". Acknowledge their last answer, then ask the first question of the new phase as described in YOUR TASK.`;
  } else {
    prompt = 'Acknowledge their answer. Then ask the next question as described in YOUR TASK. Do NOT repeat any previous question.';
  }

  const messages = buildLLMMessages(updatedState);
  messages.push({ role: 'user', content: prompt });

  const response = await generateResponse(messages, 0, customApiKey || state.customApiKey);

  const aiMessage: ConversationMessage = {
    role: 'ai',
    content: response.content,
    nodeType: updatedState.isComplete ? 'wrap_up' : 'main_question',
    timestamp: new Date().toISOString(),
  };

  return {
    ...updatedState,
    messages: [...updatedState.messages, aiMessage],
    aiResponse: response.content,
  };
}
