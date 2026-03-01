"use client";

import { useState, useCallback } from "react";
import Tesseract from "tesseract.js";

export type Language = "bangla" | "english" | "both";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [language, setLanguage] = useState<Language>("bangla");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleFileSelect = useCallback((file: File) => {
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      if (file.type.startsWith("image/")) {
        setFileType("image");
      } else if (file.type === "application/pdf") {
        setFileType("pdf");
      }
      
      setExtractedText("");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleOCRProcess = async () => {
    if (!selectedFile) return;

    // Debug: Log file info
    console.log("OCR Processing - File:", selectedFile.name, "Type:", selectedFile.type, "Size:", selectedFile.size);

    setIsProcessing(true);
    setProgress(0);
    setStatus("Initializing OCR engine...");

    try {
      // Check if file is a PDF - Tesseract.js doesn't support PDFs natively
      if (selectedFile.type === "application/pdf") {
        setExtractedText("Error: PDF files are not supported. Please convert your PDF to an image (PNG, JPG) and try again.");
        setIsProcessing(false);
        setStatus("");
        return;
      }

      // Validate file is an image
      if (!selectedFile.type.startsWith("image/")) {
        setExtractedText("Error: Invalid file type. Please upload an image file (PNG, JPG, JPEG, BMP).");
        setIsProcessing(false);
        setStatus("");
        return;
      }

      // Convert file to a format Tesseract.js can read reliably
      // Create a new Blob with explicit image type
      const imageResponse = await fetch(URL.createObjectURL(selectedFile));
      const imageBlob = await imageResponse.blob();
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      
      // Create a clean blob for Tesseract
      const cleanBlob = new Blob([imageArrayBuffer], { type: selectedFile.type });
      console.log("OCR Processing - Cleaned blob type:", cleanBlob.type, "Size:", cleanBlob.size);

      // Determine which languages to use
      let languages: string[];
      switch (language) {
        case "bangla":
          languages = ["ben"];
          break;
        case "english":
          languages = ["eng"];
          break;
        case "both":
          languages = ["ben", "eng"];
          break;
      }

      const langString = languages.join("+");
      
      const result = await Tesseract.recognize(
        cleanBlob,
        langString,
        {
          logger: (m) => {
            console.log("OCR Logger:", m);
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
              setStatus(`Recognizing text... ${Math.round(m.progress * 100)}%`);
            } else {
              setStatus(m.status);
            }
          },
        }
      );

      let extracted = result.data.text.trim();

      // If both languages, separate the results
      if (language === "both" && languages.length === 2) {
        // Tesseract returns combined results, we'll show it as is
        // The model tries to detect and recognize both languages
        extracted = `🇧🇩 বাংলা + 🇬🇧 English:\n\n${extracted}`;
      } else if (language === "bangla") {
        extracted = `🇧🇩 বাংলা:\n\n${extracted}`;
      } else {
        extracted = `🇬🇧 English:\n\n${extracted}`;
      }

      setExtractedText(extracted || "No text detected in the image.");
    } catch (error) {
      console.error("OCR processing failed:", error);
      // Provide more specific error message based on the error type
      let errorMessage = "Error processing file. Please try again.";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes("failed to decode") || errorMsg.includes("invalid image")) {
          errorMessage = "Error: The image file appears to be corrupted or in an unsupported format. Please try a different image.";
        } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
          errorMessage = "Error: Network error while processing. Please check your connection and try again.";
        } else if (errorMsg.includes("memory")) {
          errorMessage = "Error: Not enough memory to process this image. Please try a smaller image.";
        }
      }
      
      setExtractedText(errorMessage);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus("");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    setExtractedText("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            <span className="text-purple-400">Bangla & English</span> OCR
          </h1>
          <p className="text-slate-400 text-lg">
            Extract text from Bangla/Bengali and English images instantly
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* Upload Area */}
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 mb-8 ${
            dragActive
              ? "border-purple-400 bg-purple-500/10"
              : "border-slate-600 hover:border-purple-500/50 bg-slate-800/30"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="p-8 md:p-12 text-center">
            {previewUrl ? (
              <div className="space-y-6">
                <div className="relative inline-block">
                  {fileType === "image" ? (
                    <img
                      src={previewUrl || ""}
                      alt="Selected file"
                      className="max-h-64 rounded-lg shadow-2xl border border-slate-600"
                    />
                  ) : fileType === "pdf" ? (
                    <div className="w-48 h-64 rounded-lg shadow-2xl border border-slate-600 bg-slate-700 flex flex-col items-center justify-center p-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 text-red-400 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-white text-sm text-center">PDF Document</span>
                    </div>
                  ) : null}
                  <button
                    onClick={handleReset}
                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                    aria-label="Remove file"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-slate-400 text-sm">
                  {selectedFile?.name} ({(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-lg font-medium">
                    Drop your image here
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    or click to browse files
                  </p>
                </div>
                <p className="text-slate-500 text-xs">
                  Supports PNG, JPG, JPEG, BMP images and PDF documents
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Language Selector */}
        {selectedFile && (
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-2 flex gap-2">
              <button
                onClick={() => setLanguage("bangla")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  language === "bangla"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                🇧🇩 বাংলা
              </button>
              <button
                onClick={() => setLanguage("english")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  language === "english"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => setLanguage("both")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  language === "both"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                🔤 Both
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {selectedFile && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleOCRProcess}
              disabled={isProcessing}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{status || "Processing..."}</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {language === "bangla" ? "Extract Bangla Text" : language === "english" ? "Extract English Text" : "Extract Bangla & English Text"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Area */}
        {extractedText && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Extracted Text
              </h2>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(extractedText);
                  } catch {
                    // Fallback for environments where clipboard API is blocked
                    const textArea = document.createElement('textarea');
                    textArea.value = extractedText;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-9999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                      document.execCommand('copy');
                    } catch {
                      alert('Unable to copy. Please select and copy the text manually.');
                    }
                    document.body.removeChild(textArea);
                  }
                }}
                className="text-slate-400 hover:text-white transition-colors p-2"
                title="Copy to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-white text-lg leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-noto-bengali)]">
                {extractedText}
              </p>
            </div>
          </div>
        )}

        {/* Features Section */}
        {!selectedFile && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-slate-800/30 backdrop-blur rounded-xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Fast Processing</h3>
              <p className="text-slate-400 text-sm">
                Extract Bangla text from images and PDFs in seconds with advanced OCR technology
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur rounded-xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-pink-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Accurate Results</h3>
              <p className="text-slate-400 text-sm">
                High accuracy recognition for Bangla characters and text
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur rounded-xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Secure & Private</h3>
              <p className="text-slate-400 text-sm">
                Your images are processed securely and never stored on our servers
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 text-sm">
        <p>Bangla OCR &copy; {new Date().getFullYear()} - Powered by AI</p>
      </footer>
    </main>
  );
}
