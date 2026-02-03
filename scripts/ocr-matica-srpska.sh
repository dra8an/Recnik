#!/bin/bash
# OCR the Matica Srpska dictionary PDF using Tesseract
# This script converts PDF pages to images and runs Tesseract OCR

set -e

PDF_FILE="/Users/draganbesevic/Projects/claude/fetch/Recnik-srpskoga-jezika-2011.pdf"
WORK_DIR="/Users/draganbesevic/Projects/claude/Recnik/data/raw/matica-srpska"
IMAGE_DIR="$WORK_DIR/ocr-images"
OUTPUT_DIR="$WORK_DIR/ocr-output"
FINAL_OUTPUT="$WORK_DIR/recnik-ocr.txt"

echo "==================================="
echo "Matica Srpska Dictionary OCR"
echo "==================================="
echo ""
echo "PDF: $PDF_FILE"
echo "Output: $FINAL_OUTPUT"
echo ""

# Get total pages
TOTAL_PAGES=$(pdfinfo "$PDF_FILE" | grep "Pages:" | awk '{print $2}')
echo "Total pages: $TOTAL_PAGES"

# Create directories
mkdir -p "$IMAGE_DIR"
mkdir -p "$OUTPUT_DIR"

# Convert PDF to images (300 DPI PNG)
echo ""
echo "Step 1: Converting PDF to images..."
echo "This may take a while for $TOTAL_PAGES pages..."

# Process in batches of 100 pages to show progress
BATCH_SIZE=100
for ((start=1; start<=TOTAL_PAGES; start+=BATCH_SIZE)); do
    end=$((start + BATCH_SIZE - 1))
    if [ $end -gt $TOTAL_PAGES ]; then
        end=$TOTAL_PAGES
    fi

    echo "  Converting pages $start-$end..."
    pdftoppm -png -r 300 -f $start -l $end "$PDF_FILE" "$IMAGE_DIR/page"
done

echo "  Image conversion complete."

# Run Tesseract OCR on each image
echo ""
echo "Step 2: Running Tesseract OCR..."

# Clear previous output
> "$FINAL_OUTPUT"

# Process each image
for img in $(ls "$IMAGE_DIR"/page-*.png | sort -V); do
    page_num=$(basename "$img" .png | sed 's/page-//')

    # Show progress every 50 pages
    if [ $((10#$page_num % 50)) -eq 0 ]; then
        echo "  Processing page $page_num of $TOTAL_PAGES..."
    fi

    # Run Tesseract and append to output
    tesseract "$img" stdout -l srp 2>/dev/null >> "$FINAL_OUTPUT"

    # Add page separator
    echo -e "\n--- PAGE $page_num ---\n" >> "$FINAL_OUTPUT"
done

echo ""
echo "==================================="
echo "OCR Complete!"
echo "==================================="
echo ""
echo "Output file: $FINAL_OUTPUT"
echo "File size: $(du -h "$FINAL_OUTPUT" | cut -f1)"
echo "Line count: $(wc -l < "$FINAL_OUTPUT")"
echo ""

# Clean up images to save space (optional - comment out to keep)
# echo "Cleaning up images..."
# rm -rf "$IMAGE_DIR"

echo "Done!"
