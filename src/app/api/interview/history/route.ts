import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const interviews = await prisma.interview.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        targetRole: true,
        status: true,
        durationSeconds: true,
        startedAt: true,
        endedAt: true,
        overallScore: true,
        createdAt: true,
        _count: {
          select: { messages: true },
        },
        feedback: {
          select: {
            overallRating: true,
            summary: true,
            detailedReport: true,
            techProficiency: true,
          },
        },
      },
    });

    // Flatten feedback for the dashboard
    const mapped = interviews.map((i) => ({
      ...i,
      feedback: i.feedback
        ? {
            overallScore: (i.feedback.detailedReport as any)?.overallScore ?? (i.overallScore ? Number(i.overallScore) : 0),
            overallRating: i.feedback.overallRating,
            summary: i.feedback.summary,
            techProficiency: i.feedback.techProficiency ?? (i.feedback.detailedReport as any)?.techProficiency ?? null,
          }
        : null,
    }));

    return Response.json({ interviews: mapped });
  } catch (error) {
    console.error('Interview history error:', error);
    return Response.json(
      { error: 'Failed to fetch interview history' },
      { status: 500 }
    );
  }
}
