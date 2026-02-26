import sys
import base64
from paddleocr import PaddleOCR
from PIL import Image
import fitz  # pip install PyMuPDF

ocr = PaddleOCR(use_angle_cls=True, lang='en')

def pdf_to_image(pdf_path):
    doc = fitz.open(pdf_path)
    for page in doc: page.get_pixmap().save(f"page.png")
    doc.close()

if __name__ == "__main__":
    file_path = sys.argv[1]
    if file_path.endswith('.pdf'):
        pdf_to_image(file_path)
        result = ocr.ocr('page.png')
    else:
        result = ocr.ocr(file_path)
    
    if not result or not result[0]:
        print('')
    else:
        text = '\n'.join([line[1][0] for line in result[0]])
        print(text)
