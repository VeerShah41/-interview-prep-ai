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

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { techStack: true },
    });

    return Response.json({ techStack: user?.techStack || [] });
  } catch (error) {
    console.error('Settings GET error:', error);
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // We expect body.techStack to be an array of strings
    if (!Array.isArray(body.techStack)) {
      return Response.json({ error: 'Invalid tech stack format' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.userId },
      data: { techStack: body.techStack },
      select: { techStack: true },
    });

    return Response.json({ techStack: updatedUser.techStack });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
