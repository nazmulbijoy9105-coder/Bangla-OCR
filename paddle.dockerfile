FROM paddlepaddle/paddle:3.0.0
RUN pip install paddleocr flask pillow pdf2image
COPY paddle-worker.py .
EXPOSE 5000
CMD ["python", "paddle-worker.py"]
