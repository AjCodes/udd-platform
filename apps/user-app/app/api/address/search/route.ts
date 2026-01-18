import { NextRequest, NextResponse } from 'next/server';

interface AddressSuggestion {
    id: string;
    displayName: string;
    lat: number;
    lng: number;
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');

    if (!query || query.length < 3) {
        return NextResponse.json({ suggestions: [] });
    }

    try {
        // Use the PDOK "free" endpoint which searches all location types
        const response = await fetch(
            `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(query)}&rows=8`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`PDOK API error: ${response.status}`);
        }

        const data = await response.json();
        const suggestions: AddressSuggestion[] = [];

        if (data.response?.docs) {
            for (const doc of data.response.docs) {
                const centroid = doc.centroide_ll;
                if (centroid) {
                    const match = centroid.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
                    if (match) {
                        suggestions.push({
                            id: doc.id,
                            displayName: doc.weergavenaam || doc.straatnaam || doc.naam || 'Unknown',
                            lng: parseFloat(match[1]),
                            lat: parseFloat(match[2]),
                        });
                    }
                }
            }
        }

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Address search error:', error);
        return NextResponse.json(
            { error: 'Failed to search addresses', suggestions: [] },
            { status: 500 }
        );
    }
}
