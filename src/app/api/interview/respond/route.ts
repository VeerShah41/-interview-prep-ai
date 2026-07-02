import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { processResponse } from '@/lib/services/interview/engine';
import type { InterviewGraphState } from '@/lib/services/interview/types';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, transcript } = body;

    if (!sessionId || transcript === undefined) {
      return Response.json(
        { error: 'Session ID and transcript are required' },
        { status: 400 }
      );
    }

    // Get interview and verify ownership
    const interview = await prisma.interview.findFirst({
      where: {
        id: sessionId,
        userId: authUser.userId,
        status: 'in_progress',
      },
    });

    if (!interview) {
      return Response.json(
        { error: 'Interview session not found or already completed' },
        { status: 404 }
      );
    }

    // Restore graph state
    const graphState = interview.graphState as unknown as InterviewGraphState;
    if (!graphState) {
      return Response.json(
        { error: 'Interview state is corrupted' },
        { status: 500 }
      );
    }

    // Get current message count for sequence
    const messageCount = await prisma.message.count({
      where: { interviewId: sessionId },
    });

    // Save candidate message
    await prisma.message.create({
      data: {
        interviewId: sessionId,
        role: 'candidate',
        content: transcript,
        sequence: messageCount,
      },
    });

    const customApiKey = request.headers.get('x-custom-api-key') || undefined;
    const difficultyLevel = request.headers.get('x-difficulty-level') || undefined;

    // Inject difficulty level into state if present
    if (difficultyLevel) {
      (graphState as any).difficultyLevel = difficultyLevel;
    }

    // Process through conversation engine
    const newState = await processResponse(graphState, transcript, customApiKey);

    // Save AI response message
    const lastAiMessage = newState.messages.filter((m) => m.role === 'ai').pop();
    if (lastAiMessage) {
      await prisma.message.create({
        data: {
          interviewId: sessionId,
          role: 'ai',
          content: lastAiMessage.content,
          nodeType: lastAiMessage.nodeType || null,
          sequence: messageCount + 1,
        },
      });
    }

    // Update interview state
    await prisma.interview.update({
      where: { id: sessionId },
      data: {
        graphState: JSON.parse(JSON.stringify(newState)),
        ...(newState.isComplete
          ? {
              status: 'completed',
              endedAt: new Date(),
              durationSeconds: Math.floor(
                (Date.now() - new Date(newState.startedAt).getTime()) / 1000
              ),
            }
          : {}),
      },
    });

    return Response.json({
      aiResponse: newState.aiResponse,
      state: {
        currentNode: newState.currentNode,
        isComplete: newState.isComplete,
        topicsRemaining: newState.topicsRemaining.length,
        topicsCovered: newState.topicsCovered.length,
        currentTopic: newState.currentTopic?.name || null,
        lastAnswerQuality: newState.lastAnswerQuality,
      },
    });
  } catch (error) {
    console.error('Process response error:', error);
    return Response.json(
      { error: 'Failed to process response' },
      { status: 500 }
    );
  }
}
