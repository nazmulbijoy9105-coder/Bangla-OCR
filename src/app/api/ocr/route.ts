import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// In a production environment, you would integrate with the Python Bangla-OCR
// backend. This is a mock implementation that demonstrates the API structure.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Save the uploaded image temporarily
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique filename
    const filename = `${uuidv4()}-${image.name}`;
    const filepath = join("/tmp", filename);
    
    await writeFile(filepath, buffer);

    // In production, you would call your Python OCR backend here
    // For example:
    // const ocrResult = await callPythonOCRBackend(filepath);
    
    // Mock OCR response for demonstration
    const mockOCRResult = generateMockBanglaText();

    // Clean up temporary file
    await unlink(filepath).catch(() => {});

    return NextResponse.json({
      success: true,
      text: mockOCRResult,
      confidence: 0.95,
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}

// Mock function to generate sample Bangla text
// In production, this would be replaced by actual OCR processing
function generateMockBanglaText(): string {
  const sampleTexts = [
    "বাংলা ভাষা বাংলাদেশের জাতীয় ভাষা। এটি ইন্দো-আর্য ভাষা পরিবারের অন্তর্গত।",
    "বাংলাদেশ একটি সুন্দর দেশ। এখানে অনেক নদী এবং প্রকৃতি।",
    "আমি বাংলায় কথা বলতে পারি। বাংলা ভাষা খুবই মধুর।",
    "শিক্ষা জাতির মেরুদণ্ড। শিক্ষিত জাতি উন্নতি করতে পারে।",
  ];
  
  return sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Bangla OCR API is running",
  });
}
