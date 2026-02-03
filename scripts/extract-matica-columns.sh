#!/bin/bash
# Extract text from Matica Srpska dictionary PDF, column by column
# This handles the two-column layout properly

PDF_FILE="/Users/draganbesevic/Projects/claude/fetch/Recnik-srpskoga-jezika-2011.pdf"
OUTPUT_DIR="/Users/draganbesevic/Projects/claude/Recnik/data/raw/matica-srpska"
OUTPUT_FILE="$OUTPUT_DIR/recnik-columns.txt"

# Create output directory if needed
mkdir -p "$OUTPUT_DIR"

# Clear output file
> "$OUTPUT_FILE"

# Get total pages
TOTAL_PAGES=$(pdfinfo "$PDF_FILE" | grep "Pages:" | awk '{print $2}')
echo "Total pages: $TOTAL_PAGES"

# Page dimensions from pdfinfo: 572.04 x 833.4 pts
# Dictionary content starts at page 15 (index 14)
# Each page has two columns, roughly 280pts wide each with margin

START_PAGE=15
END_PAGE=$TOTAL_PAGES

echo "Extracting pages $START_PAGE to $END_PAGE..."

for ((page=$START_PAGE; page<=$END_PAGE; page++)); do
    # Extract left column (x=0, width=280)
    pdftotext -f $page -l $page -x 0 -y 50 -W 285 -H 780 "$PDF_FILE" - >> "$OUTPUT_FILE"

    # Extract right column (x=285, width=285)
    pdftotext -f $page -l $page -x 285 -y 50 -W 285 -H 780 "$PDF_FILE" - >> "$OUTPUT_FILE"

    if [ $((page % 100)) -eq 0 ]; then
        echo "  Processed page $page..."
    fi
done

echo "Extraction complete!"
echo "Output: $OUTPUT_FILE"
wc -l "$OUTPUT_FILE"
