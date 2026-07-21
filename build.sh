#!/bin/bash

# Build for both chrome and firefox if no argument, or specific target
if [ -z "$1" ]; then
    TARGETS=("chromium" "firefox" "chrome")
else
    TARGETS=("$1")
fi

echo "Starting build process..."

mkdir -p releases

for TARGET in "${TARGETS[@]}"; do
    echo "Building for $TARGET..."

    # Recreate clean dist directory
    rm -rf dist
    mkdir -p dist

    # Copy base files
    cp -r background content docs/icons popup schemas dist/

    # Copy sidepanel only for non-firefox targets
    if [ "$TARGET" != "firefox" ]; then
        cp -r sidepanel dist/
    fi

    # Parse/Modify manifest using Python for reliability
    python3 build.py "$TARGET"

    # Create zip
    cd dist
    zip -r "../releases/ai-chat-exporter-$TARGET.zip" .
    cd ..

    echo "Build complete for $TARGET: releases/ai-chat-exporter-$TARGET.zip"
done

echo "All builds complete."
