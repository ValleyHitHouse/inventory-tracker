import { NextResponse } from 'next/server';
import { requireOwner, getFleet } from '@/lib/agentsDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isOwner } = await requireOwner();
  if (!isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const fleet = await getFleet();
  return NextResponse.json(fleet, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
