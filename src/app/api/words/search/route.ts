import { NextRequest, NextResponse } from "next/server";
import { searchWords, getAutocompleteSuggestions } from "@/lib/search";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const autocomplete = searchParams.get("autocomplete") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const partOfSpeech = searchParams.get("pos") || undefined;

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "Search query is required" },
      { status: 400 }
    );
  }

  try {
    if (autocomplete) {
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const suggestions = await getAutocompleteSuggestions(query, Math.min(limit, 20));
      return NextResponse.json({ success: true, data: suggestions });
    }

    const results = await searchWords({
      query,
      page,
      pageSize: Math.min(pageSize, 100),
      partOfSpeech,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}
