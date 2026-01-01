import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Debug: Test Gemini multilingual extraction
export async function GET(request: NextRequest) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return NextResponse.json({ error: 'No Gemini key' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Sample reviews
    const reviewTexts = `[5★] [en] Great vegan options! The curry was amazing and staff spoke English well.
---
[4★] [ja] ビーガンカレーが絶品でした。店内は落ち着いた雰囲気。クレジットカード使えます。
---
[5★] [en] Perfect for vegans! The matcha latte was incredible. Tourist-friendly place.`;

    const prompt = `Analyze these restaurant reviews and extract data for VEGAN TOURISTS.

Reviews:
${reviewTexts}

Return a JSON object with:
1. "multilingual_summary": Highlights in 4 languages (3-5 items each, max 15 chars per item)
2. "inbound_scores": Tourist-friendliness scores (0-100 each)

JSON format:
{
  "multilingual_summary": {
    "ja": ["日本語で良い点1", "日本語で良い点2"],
    "en": ["Good point 1", "Good point 2"],
    "ko": ["한국어 좋은점1", "좋은점2"],
    "zh": ["中文优点1", "优点2"]
  },
  "inbound_scores": {
    "englishFriendly": 0-100,
    "cardsAccepted": 0-100,
    "veganConfidence": 0-100,
    "touristPopular": 0-100
  }
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        let parsed = null;
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        }

        return NextResponse.json({
            success: true,
            rawResponse: text.substring(0, 1000),
            parsed: parsed
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
