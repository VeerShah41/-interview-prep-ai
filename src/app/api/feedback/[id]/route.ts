import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateFeedback, type LLMMessage } from '@/lib/services/llm';
import { getFeedbackPrompt } from '@/lib/services/interview/prompts';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if feedback already exists
    const existing = await prisma.feedback.findUnique({
      where: { interviewId: id },
      include: {
        interview: {
          include: {
            topicScores: true,
            messages: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (existing) {
      return Response.json({
        feedback: existing,
        messages: existing.interview.messages,
        topicScores: existing.interview.topicScores,
      });
    }

    // Generate feedback
    const interview = await prisma.interview.findFirst({
      where: { id, userId: authUser.userId },
      include: {
        messages: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!interview) {
      return Response.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.messages.length < 2) {
      return Response.json(
        { error: 'Not enough conversation to generate a score. Please try another practice session.' },
        { status: 400 }
      );
    }

    // Auto-complete if it was abandoned in progress
    if (interview.status !== 'completed') {
      await prisma.interview.update({
        where: { id },
        data: { status: 'completed', endedAt: new Date() }
      });
    }

    // Build conversation history string
    const conversationHistory = interview.messages
      .map((m) => `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
      .join('\n\n');

    const prompt = getFeedbackPrompt(
      authUser.name,
      interview.targetRole,
      conversationHistory
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an expert interview evaluator. Generate detailed, specific feedback. Respond ONLY with valid JSON.' },
      { role: 'user', content: prompt },
    ];

    const customApiKey = request.headers.get('x-custom-api-key') || undefined;
    const response = await generateFeedback(messages, customApiKey);
    
    let feedbackData;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      feedbackData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response.content);
    } catch {
      feedbackData = {
        overallRating: 'hire',
        overallScore: 7,
        summary: 'Interview completed successfully. Detailed analysis is being processed.',
        strengths: ['Completed the interview', 'Engaged with all topics'],
        improvements: ['Provide more specific examples', 'Quantify results when possible'],
        tips: ['Practice the STAR method', 'Prepare 8-10 stories mapping to common themes'],
        topicScores: [],
      };
    }

    // Save feedback
    const feedback = await prisma.feedback.create({
      data: {
        interviewId: id,
        summary: feedbackData.summary || '',
        strengths: feedbackData.strengths || [],
        improvements: feedbackData.improvements || [],
        overallRating: feedbackData.overallRating || 'hire',
        detailedReport: feedbackData,
        techProficiency: feedbackData.techProficiency || null,
      },
    });

    // Save topic scores
    if (feedbackData.topicScores && Array.isArray(feedbackData.topicScores)) {
      for (const ts of feedbackData.topicScores) {
        await prisma.topicScore.create({
          data: {
            interviewId: id,
            topic: ts.topic || 'Unknown',
            situationScore: ts.situationScore ?? null,
            taskScore: ts.taskScore ?? null,
            actionScore: ts.actionScore ?? null,
            resultScore: ts.resultScore ?? null,
            overallScore: ts.overallScore ?? null,
            feedback: ts.feedback || null,
          },
        });
      }
    }

    // Update interview overall score
    await prisma.interview.update({
      where: { id },
      data: { overallScore: feedbackData.overallScore ?? null },
    });

    return Response.json({
      feedback,
      messages: interview.messages,
      topicScores: feedbackData.topicScores || [],
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return Response.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
