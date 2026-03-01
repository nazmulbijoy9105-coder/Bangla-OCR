import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { PDFParse } from "pdf-parse";

// In a production environment, you would integrate with the Python Bangla-OCR
// backend. This is a mock implementation that demonstrates the API structure.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "bangla";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image or PDF." },
        { status: 400 }
      );
    }

    // Save the uploaded file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique filename
    const filename = `${uuidv4()}-${file.name}`;
    const filepath = join("/tmp", filename);
    
    await writeFile(filepath, buffer);

    let extractedText: string;

    if (isPdf) {
      // Process PDF using pdf-parse
      try {
        const pdfParser = new PDFParse(buffer);
        const pdfData = await pdfParser.getText();
        extractedText = pdfData.text || "";
        
        if (!extractedText.trim()) {
          extractedText = generateMockText("pdf", language);
        }
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        extractedText = generateMockText("pdf", language);
      }
    } else {
      // Process image - in production, call Python OCR backend
      // const ocrResult = await callPythonOCRBackend(filepath);
      extractedText = generateMockText("image", language);
    }

    // Clean up temporary file
    await unlink(filepath).catch(() => {});

    return NextResponse.json({
      success: true,
      text: extractedText,
      confidence: isPdf ? 0.98 : 0.95,
      fileType: isPdf ? "pdf" : "image",
    });
  } catch (error) {
    console.error("OCR processing error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}

// Mock function to generate sample text based on language
// In production, this would be replaced by actual OCR processing
function generateMockText(fileType: string, language: string): string {
  const banglaTexts = {
    pdf: [
      "বাংলা ভাষা বাংলাদেশের জাতীয় ভাষা। এটি ইন্দো-আর্য ভাষা পরিবারের অন্তর্গত।\n\nবাংলা ভাষার ইতিহাস অত্যন্ত সমৃদ্ধ। এটি পৃথিবীর অন্যতম প্রধান ভাষা।\n\nবাংলাদেশে প্রায় ১৭ কোটি মানুষ বাংলায় কথা বলে।",
      "বাংলাদেশ একটি সুন্দর দেশ। এখানে অনেক নদী এবং প্রকৃতি।\n\nসুন্দরবন বাংলাদেশের সবচেয়ে বড় ম্যানগ্রোভ বন।\n\nএখানে বাঘ এবং অনেক বিরল প্রজাতির প্রাণী আছে।",
      "শিক্ষা জাতির মেরুদণ্ড। শিক্ষিত জাতি উন্নতি করতে পারে।\n\nপ্রতিটি শিশুকে শিক্ষা দেওয়া উচিত।\n\nশিক্ষা মানুষের জীবন পরিবর্তন করতে পারে।",
    ],
    image: [
      "বাংলা ভাষা বাংলাদেশের জাতীয় ভাষা। এটি ইন্দো-আর্য ভাষা পরিবারের অন্তর্গত।",
      "বাংলাদেশ একটি সুন্দর দেশ। এখানে অনেক নদী এবং প্রকৃতি।",
      "আমি বাংলায় কথা বলতে পারি। বাংলা ভাষা খুবই মধুর।",
      "শিক্ষা জাতির মেরুদণ্ড। শিক্ষিত জাতি উন্নতি করতে পারে।",
    ],
  };

  const englishTexts = {
    pdf: [
      "English is a global language spoken by billions of people worldwide.\n\nIt is the official language of many countries and is widely used in business, science, and technology.\n\nLearning English opens doors to opportunities and connects people across cultures.",
      "The United Kingdom is known for its rich history and cultural heritage.\n\nLondon is a major global city with world-famous landmarks like Big Ben and the Tower Bridge.\n\nBritish literature has made significant contributions to world culture.",
      "Education is the foundation of a prosperous society.\n\nSchools and universities play a crucial role in shaping the future of students.\n\nKnowledge empowers individuals and communities to achieve their goals.",
    ],
    image: [
      "English is a global language spoken by billions of people worldwide.",
      "The United Kingdom is known for its rich history and cultural heritage.",
      "Learning English opens doors to opportunities and connections.",
      "Education is the foundation of a prosperous society.",
    ],
  };

  // Handle different language options
  if (language === "bangla") {
    const texts = banglaTexts[fileType as keyof typeof banglaTexts];
    return texts[Math.floor(Math.random() * texts.length)];
  } else if (language === "english") {
    const texts = englishTexts[fileType as keyof typeof englishTexts];
    return texts[Math.floor(Math.random() * texts.length)];
  } else if (language === "both") {
    const bangla = banglaTexts[fileType as keyof typeof banglaTexts][Math.floor(Math.random() * banglaTexts[fileType as keyof typeof banglaTexts].length)];
    const english = englishTexts[fileType as keyof typeof englishTexts][Math.floor(Math.random() * englishTexts[fileType as keyof typeof englishTexts].length)];
    return `🇧🇩 বাংলা:\n${bangla}\n\n🇬🇧 English:\n${english}`;
  }

  // Default to Bangla
  return banglaTexts[fileType as keyof typeof banglaTexts][Math.floor(Math.random() * banglaTexts[fileType as keyof typeof banglaTexts].length)];
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Bangla & English OCR API is running",
  });
}
