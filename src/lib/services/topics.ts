export const BEHAVIORAL_TOPICS = [
  {
    id: 'leadership',
    name: 'Leadership',
    questions: [
      'Tell me about a time you led a team through a challenging project. What was the situation, and how did you approach it?',
      'Describe a situation where you had to motivate a team member who was struggling. How did you handle it?',
      'Walk me through a time when you had to make a tough decision that affected your team.',
    ],
    seniorOnly: false,
  },
  {
    id: 'conflict',
    name: 'Conflict Resolution',
    questions: [
      'Tell me about a time you had a significant disagreement with a colleague. How did you resolve it?',
      'Describe a situation where you received pushback on your idea. What happened?',
      'Walk me through a time when you had to mediate a conflict between team members.',
    ],
    seniorOnly: false,
  },
  {
    id: 'failure',
    name: 'Failure & Learning',
    questions: [
      'Tell me about a time when something you were responsible for didn\'t go as planned. What happened and what did you learn?',
      'Describe your biggest professional mistake. How did you handle the aftermath?',
      'Walk me through a project that failed. What would you do differently today?',
    ],
    seniorOnly: false,
  },
  {
    id: 'pressure',
    name: 'Working Under Pressure',
    questions: [
      'Tell me about a time you had to deliver under a very tight deadline. How did you manage it?',
      'Describe a situation where you had multiple competing priorities. How did you decide what to focus on?',
      'Walk me through a high-stakes situation where the outcome really mattered.',
    ],
    seniorOnly: false,
  },
  {
    id: 'innovation',
    name: 'Innovation & Problem Solving',
    questions: [
      'Tell me about a time you proposed a new approach or solution that improved a process or product.',
      'Describe a complex problem you solved in a creative or unconventional way.',
      'Walk me through a time when you identified an opportunity that others had missed.',
    ],
    seniorOnly: false,
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    questions: [
      'Tell me about a successful project where you worked closely with people from different teams or departments.',
      'Describe a time when you had to collaborate with someone whose working style was very different from yours.',
      'Walk me through how you built consensus on a controversial decision.',
    ],
    seniorOnly: false,
  },
  {
    id: 'adaptability',
    name: 'Adaptability',
    questions: [
      'Tell me about a time when requirements changed significantly mid-project. How did you adapt?',
      'Describe a situation where you had to quickly learn a new skill or technology to complete a task.',
      'Walk me through a time when you had to step outside your comfort zone professionally.',
    ],
    seniorOnly: false,
  },
  {
    id: 'decision_making',
    name: 'Decision Making',
    questions: [
      'Walk me through a difficult decision you made with incomplete information. What was your process?',
      'Describe a time when you had to choose between two good options. How did you decide?',
      'Tell me about a decision you made that was unpopular but turned out to be the right call.',
    ],
    seniorOnly: true,
  },
];

export function selectTopicsForRole(targetRole: string, count = 4): typeof BEHAVIORAL_TOPICS {
  const isSenior = /senior|lead|principal|staff|manager|director|head|vp/i.test(targetRole);

  const eligibleTopics = isSenior
    ? BEHAVIORAL_TOPICS
    : BEHAVIORAL_TOPICS.filter((t) => !t.seniorOnly);

  // Shuffle and select
  const shuffled = [...eligibleTopics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomQuestion(topic: typeof BEHAVIORAL_TOPICS[0]): string {
  const idx = Math.floor(Math.random() * topic.questions.length);
  return topic.questions[idx];
}
