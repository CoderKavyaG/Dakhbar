import { NextRequest, NextResponse } from 'next/server';
import { getLiveSearchSuggestions } from '@/lib/search-suggestions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') ?? '';
    const suggestions = await getLiveSearchSuggestions(q);
    return NextResponse.json(suggestions);
  } catch (err: unknown) {
    console.error('Error fetching search suggestions:', err);
    return NextResponse.json(
      {
        trending: [],
        stories: [],
        topics: [],
        sources: [],
        researchEligible: false,
        totalMatches: 0,
        error: 'Failed to fetch suggestions',
      },
      { status: 500 }
    );
  }
}
