#!/bin/bash

# Specify the source and target directories
SRC_DIR="./wiki"
TARGET_DIR="./elastx"

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# Export the variables that envsubst will substitute
export CUST=elastx

# Find all markdown files in the source directory and its subdirectories
find "$SRC_DIR" -name '*.md' | while read -r file; do
    # Construct the new file path under the target directory while preserving the directory structure
    relative_path="${file#$SRC_DIR/}"
    new_file="$TARGET_DIR/$relative_path"

    # Create the directory for the new file
    mkdir -p "$(dirname "$new_file")"

    # Run envsubst on the file and save it to the new location
    envsubst < "$file" > "$new_file"
done

