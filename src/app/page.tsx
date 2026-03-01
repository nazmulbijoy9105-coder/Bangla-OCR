"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

export type Language = "bangla" | "english" | "both";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [language, setLanguage] = useState<Language>("bangla");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardType, setKeyboardType] = useState<"avro" | "bijoy">("avro");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);

  // Set PDF.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      setSelectedFile(file);
      setExtractedText("");
      
      if (file.type.startsWith("image/")) {
        setFileType("image");
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setPreviewUrls([url]);
        setPdfPageCount(0);
      } else if (file.type === "application/pdf") {
        setFileType("pdf");
        setStatus("Loading PDF...");
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setPdfPageCount(pdf.numPages);
          setCurrentPdfPage(1);
          
          // Generate preview for first page
          const page = await pdf.getPage(1);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const url = canvas.toDataURL("image/png");
            setPreviewUrl(url);
            setPreviewUrls([url]);
          }
        } catch (error) {
          console.error("Error loading PDF:", error);
          setExtractedText("Error loading PDF. Please try another file.");
        }
        setStatus("");
      }
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

    console.log("OCR Processing - File:", selectedFile.name, "Type:", selectedFile.type, "Size:", selectedFile.size);

    setIsProcessing(true);
    setProgress(0);
    setStatus("Initializing OCR engine...");

    try {
      let imageBlobs: Blob[] = [];

      // Handle PDF - convert pages to images
      if (selectedFile.type === "application/pdf") {
        setStatus("Converting PDF to images...");
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const numPages = pdf.numPages;
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          setStatus(`Converting page ${pageNum} of ${numPages}...`);
          const page = await pdf.getPage(pageNum);
          const scale = 2.0; // Higher scale for better OCR
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((b) => resolve(b!), "image/png");
            });
            imageBlobs.push(blob);
          }
        }
      } else if (selectedFile.type.startsWith("image/")) {
        // Validate file is an image
        if (!selectedFile.type.startsWith("image/")) {
          setExtractedText("Error: Invalid file type. Please upload an image file (PNG, JPG, JPEG, BMP).");
          setIsProcessing(false);
          setStatus("");
          return;
        }

        // Convert file to a clean Blob
        const imageResponse = await fetch(URL.createObjectURL(selectedFile));
        const imageBlob = await imageResponse.blob();
        const imageArrayBuffer = await imageBlob.arrayBuffer();
        const cleanBlob = new Blob([imageArrayBuffer], { type: selectedFile.type });
        imageBlobs.push(cleanBlob);
      } else {
        setExtractedText("Error: Unsupported file type. Please upload an image or PDF.");
        setIsProcessing(false);
        setStatus("");
        return;
      }

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
      
      // Process each image and combine results
      let allExtractedText: string[] = [];
      
      for (let i = 0; i < imageBlobs.length; i++) {
        setStatus(`Processing page ${i + 1} of ${imageBlobs.length}...`);
        
        const result = await Tesseract.recognize(
          imageBlobs[i],
          langString,
          {
            logger: (m) => {
              console.log("OCR Logger:", m);
              if (m.status === "recognizing text") {
                const pageProgress = Math.round(m.progress * 100);
                const overallProgress = Math.round(((i * 100) + pageProgress) / imageBlobs.length);
                setProgress(overallProgress);
                setStatus(`Page ${i + 1}: Recognizing text... ${pageProgress}%`);
              } else {
                setStatus(m.status);
              }
            },
          }
        );
        
        if (result.data.text.trim()) {
          allExtractedText.push(result.data.text.trim());
        }
      }

      // Combine results
      let extracted = allExtractedText.join("\n\n--- Page ---\n\n");

      // Format output based on language
      const langLabel = language === "bangla" ? "🇧🇩 বাংলা" : language === "english" ? "🇬🇧 English" : "🇧🇩 বাংলা + 🇬🇧 English";
      const pageInfo = imageBlobs.length > 1 ? ` (${imageBlobs.length} pages)` : "";
      
      setExtractedText(`${langLabel}${pageInfo}:\n\n${extracted}` || "No text detected in the image.");
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
      {/* Hidden canvas for PDF rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      {/* Keyboard Modal */}
      {showKeyboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowKeyboard(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">
                {keyboardType === "avro" ? "🔤 Avro Phonetic Keyboard" : "⌨️ Bijoy Keyboard"}
              </h3>
              <button onClick={() => setShowKeyboard(false)} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setKeyboardType("avro")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  keyboardType === "avro" ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-400"
                }`}
              >
                Avro Phonetic
              </button>
              <button
                onClick={() => setKeyboardType("bijoy")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  keyboardType === "bijoy" ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-400"
                }`}
              >
                Bijoy Classic
              </button>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 mb-4">
              <textarea
                className="w-full h-32 bg-slate-800 text-white rounded-lg p-3 text-lg font-[family-name:var(--font-noto-bengali)]"
                placeholder={keyboardType === "avro" ? "Type in Avro Phonetic (e.g., ami bangla shikhi)" : "Type in Bijoy (e.g., v b mgm fvzmB )"}
              />
            </div>
            <div className="text-slate-400 text-sm">
              <p className="mb-2">💡 <strong>Quick Reference:</strong></p>
              {keyboardType === "avro" ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>aa → আ</div><div>ee → ঈ</div>
                  <div>ii → ই</div><div>oo → উ</div>
                  <div>u → উ</div><div>a → অ</div>
                  <div>i → ি</div><div>u → ু</div>
                  <div>kha → খ</div><div>gho → ঘ</div>
                  <div>sh → শ</div><div>ng → ং</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>dv → আ</div><div>dn → ঈ</div>
                  <div>dm → ই</div><div>do → উ</div>
                  <div>d → অ</div><div>» → ি</div>
                  <div>‡ → ু</div><div>‡j → খ</div>
                  <div>‡g → ঘ</div><div>†v → শ</div>
                  <div>†m → ং</div><div>¨ → ঁ</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            <span className="text-purple-400">Bangla & English</span> OCR
          </h1>
          <p className="text-slate-400 text-lg">
            Extract text from Bangla/Bengali and English images and PDFs instantly
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setShowKeyboard(true)}
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Bangla Keyboards
            </button>
          </div>
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
                  Supports PNG, JPG, JPEG, BMP images and multi-page PDF documents
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
