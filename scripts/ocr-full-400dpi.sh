#!/bin/bash
# Full OCR of Matica Srpska dictionary at 400 DPI (best setting)
# With progress bar and time estimates

set -e

PDF_FILE="/Users/draganbesevic/Projects/claude/fetch/Recnik-srpskoga-jezika-2011.pdf"
WORK_DIR="/Users/draganbesevic/Projects/claude/Recnik/data/raw/matica-srpska"
IMAGE_DIR="$WORK_DIR/ocr-images-400dpi"
FINAL_OUTPUT="$WORK_DIR/recnik-tesseract-400dpi.txt"
LOG_FILE="$WORK_DIR/ocr-progress.log"

# Get total pages
TOTAL_PAGES=$(pdfinfo "$PDF_FILE" | grep "Pages:" | awk '{print $2}')

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         MATICA SRPSKA DICTIONARY OCR (400 DPI)               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Total pages: $TOTAL_PAGES                                          ║"
echo "║  Started: $(date '+%Y-%m-%d %H:%M:%S')                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

mkdir -p "$IMAGE_DIR"

# Clear output files
> "$FINAL_OUTPUT"
> "$LOG_FILE"

START_TIME=$(date +%s)
LAST_UPDATE_TIME=$START_TIME

# Function to draw progress bar
draw_progress() {
    local current=$1
    local total=$2
    local width=50
    local pct=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    # Calculate ETA
    local now=$(date +%s)
    local elapsed=$((now - START_TIME))
    if [ $current -gt 0 ]; then
        local eta=$(( (elapsed * total / current) - elapsed ))
        local eta_min=$((eta / 60))
        local eta_sec=$((eta % 60))
        local eta_str=$(printf "%02d:%02d" $eta_min $eta_sec)
    else
        local eta_str="--:--"
    fi

    # Build progress bar
    printf "\r  ["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %3d%% (%d/%d) ETA: %s  " $pct $current $total $eta_str
}

# Function for 5-minute update
five_min_update() {
    local current=$1
    local total=$2
    local now=$(date +%s)
    local elapsed=$((now - START_TIME))
    local elapsed_min=$((elapsed / 60))
    local elapsed_sec=$((elapsed % 60))

    if [ $current -gt 0 ]; then
        local eta=$(( (elapsed * total / current) - elapsed ))
        local eta_min=$((eta / 60))
        local eta_sec=$((eta % 60))
        local pages_per_min=$(( current * 60 / elapsed ))
    else
        local eta_min=0
        local eta_sec=0
        local pages_per_min=0
    fi

    echo ""
    echo ""
    echo "┌─────────────────────────────────────────────────────────────┐"
    printf "│  %-59s │\n" "STATUS UPDATE - $(date '+%H:%M:%S')"
    echo "├─────────────────────────────────────────────────────────────┤"
    printf "│  Pages completed: %-5d / %-5d (%3d%%)                     │\n" $current $total $((current * 100 / total))
    printf "│  Time elapsed:    %02d:%02d                                    │\n" $elapsed_min $elapsed_sec
    printf "│  Time remaining:  ~%02d:%02d                                   │\n" $eta_min $eta_sec
    printf "│  Speed:           ~%d pages/min                            │\n" $pages_per_min
    echo "└─────────────────────────────────────────────────────────────┘"
    echo ""
}

echo "Processing pages..."
echo ""

for ((page=1; page<=TOTAL_PAGES; page++)); do
    # Draw progress bar on every page
    draw_progress $page $TOTAL_PAGES

    # 5-minute update check
    NOW=$(date +%s)
    if [ $((NOW - LAST_UPDATE_TIME)) -ge 300 ]; then
        five_min_update $page $TOTAL_PAGES
        LAST_UPDATE_TIME=$NOW
        echo "$page / $TOTAL_PAGES pages - $(date '+%H:%M:%S')" >> "$LOG_FILE"
    fi

    # Convert single page to image at 400 DPI
    img_file="$IMAGE_DIR/page-$(printf '%04d' $page).png"
    pdftoppm -png -r 400 -f $page -l $page "$PDF_FILE" "$IMAGE_DIR/temp"

    # Handle different naming conventions from pdftoppm
    if [ -f "$IMAGE_DIR/temp-$(printf '%04d' $page).png" ]; then
        mv "$IMAGE_DIR/temp-$(printf '%04d' $page).png" "$img_file"
    elif [ -f "$IMAGE_DIR/temp-$page.png" ]; then
        mv "$IMAGE_DIR/temp-$page.png" "$img_file"
    elif [ -f "$IMAGE_DIR/temp-$(printf '%06d' $page).png" ]; then
        mv "$IMAGE_DIR/temp-$(printf '%06d' $page).png" "$img_file"
    fi

    # OCR the page
    if [ -f "$img_file" ]; then
        tesseract "$img_file" stdout -l srp 2>/dev/null >> "$FINAL_OUTPUT"

        # Add page marker
        echo "" >> "$FINAL_OUTPUT"
        echo "--- PAGE $page ---" >> "$FINAL_OUTPUT"
        echo "" >> "$FINAL_OUTPUT"

        # Remove image to save space
        rm -f "$img_file"
    fi
done

# Final progress bar
draw_progress $TOTAL_PAGES $TOTAL_PAGES

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
TOTAL_MIN=$((TOTAL_TIME / 60))
TOTAL_SEC=$((TOTAL_TIME % 60))

echo ""
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      OCR COMPLETE!                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Total time:  %02d:%02d                                          ║\n" $TOTAL_MIN $TOTAL_SEC
printf "║  Output file: %-45s  ║\n" "recnik-tesseract-400dpi.txt"
printf "║  File size:   %-45s  ║\n" "$(du -h "$FINAL_OUTPUT" | cut -f1)"
printf "║  Total lines: %-45s  ║\n" "$(wc -l < "$FINAL_OUTPUT")"
echo "╚══════════════════════════════════════════════════════════════╝"

# Cleanup
rmdir "$IMAGE_DIR" 2>/dev/null || true

echo ""
echo "Ready for post-processing!"
