import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { startInterview } from '@/lib/services/interview/engine';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetRole } = body;

    if (!targetRole) {
      return Response.json(
        { error: 'Target role is required' },
        { status: 400 }
      );
    }

    // Fetch user's tech stack
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { techStack: true },
    });
    const techStack = (user?.techStack as string[]) || [];

    const customApiKey = request.headers.get('x-custom-api-key') || undefined;
    const difficultyLevel = request.headers.get('x-difficulty-level') || undefined;

    // Create interview record in database
    const interview = await prisma.interview.create({
      data: {
        userId: authUser.userId,
        targetRole,
        status: 'in_progress',
      },
    });

    // Start the conversation engine
    const state = await startInterview(interview.id, authUser.name, targetRole, techStack, customApiKey, difficultyLevel);

    // Save the greeting message
    if (state.messages.length > 0) {
      const greeting = state.messages[state.messages.length - 1];
      await prisma.message.create({
        data: {
          interviewId: interview.id,
          role: greeting.role,
          content: greeting.content,
          nodeType: greeting.nodeType || null,
          sequence: 0,
        },
      });
    }

    // Save graph state
    await prisma.interview.update({
      where: { id: interview.id },
      data: { graphState: JSON.parse(JSON.stringify(state)) },
    });

    return Response.json(
      {
        sessionId: interview.id,
        greeting: state.aiResponse,
        state: {
          currentNode: state.currentNode,
          isComplete: state.isComplete,
          topicsRemaining: state.topicsRemaining.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Start interview error:', error);
    return Response.json(
      { error: 'Failed to start interview' },
      { status: 500 }
    );
  }
}
