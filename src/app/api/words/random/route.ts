import { NextResponse } from "next/server";
import { getRandomWord } from "@/lib/search";

export async function GET() {
  try {
    const word = await getRandomWord();

    if (!word) {
      return NextResponse.json(
        { success: false, error: "No words available" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: word });
  } catch (error) {
    console.error("Random word error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get random word" },
      { status: 500 }
    );
  }
}
