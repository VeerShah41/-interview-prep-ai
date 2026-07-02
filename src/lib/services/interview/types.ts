export type NodeType =
  | 'greeting'
  | 'topic_intro'
  | 'main_question'
  | 'analyze_answer'
  | 'follow_up'
  | 'probe_deeper'
  | 'acknowledge'
  | 'handle_silence'
  | 'handle_idk'
  | 'pivot_question'
  | 'next_question'
  | 'wrap_up';

export type AnswerQuality = 'strong' | 'adequate' | 'vague' | 'weak' | 'silence' | 'idk';

export interface ConversationMessage {
  role: 'ai' | 'candidate';
  content: string;
  nodeType?: NodeType;
  timestamp: string;
}

export interface TopicState {
  id: string;
  name: string;
  questions: string[];
  score?: number;
  followUpCount: number;
  completed: boolean;
}

export interface InterviewGraphState {
  // Session metadata
  sessionId: string;
  candidateName: string;
  targetRole: string;
  techStack: string[];
  startedAt: string;
  maxDurationMinutes: number;

  // Conversation tracking
  messages: ConversationMessage[];
  currentTopic: TopicState | null;
  topicsCovered: TopicState[];
  topicsRemaining: TopicState[];

  // Current state
  currentNode: NodeType;
  questionCount: number;

  // Latest answer analysis
  lastAnswerQuality: AnswerQuality | null;
  lastCandidateAnswer: string;

  // AI response
  aiResponse: string;

  // Interview complete flag
  isComplete: boolean;
}

export const MAX_FOLLOW_UPS_PER_TOPIC = 3;
export const SILENCE_THRESHOLD_SECONDS = 15;
export const MAX_INTERVIEW_MINUTES = 30;
export const MAX_TOPICS = 4;
