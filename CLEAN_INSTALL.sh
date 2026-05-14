#!/bin/bash
# Clean Install Script - Removes warnings by cleaning dependencies
echo "========================================="
echo "IDMC Profiling - Clean Installation"
echo "========================================="
echo ""

cd "$(dirname "$0")"

echo "Step 1: Cleaning old installations..."
echo "------------------------------------"

if [ -d "frontend/node_modules" ]; then
    echo "Removing frontend node_modules..."
    rm -rf frontend/node_modules
    echo "✓ Removed"
else
    echo "✓ No frontend node_modules found"
fi

if [ -f "frontend/package-lock.json" ]; then
    echo "Removing frontend package-lock.json..."
    rm -f frontend/package-lock.json
    echo "✓ Removed"
else
    echo "✓ No frontend package-lock.json found"
fi

if [ -d "frontend/.next" ]; then
    echo "Removing frontend .next cache..."
    rm -rf frontend/.next
    echo "✓ Removed"
else
    echo "✓ No frontend .next cache found"
fi

echo ""
echo "Step 2: Installing frontend packages (this may take a moment)..."
echo "------------------------------------"
cd frontend
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERROR: npm install failed"
    exit 1
fi

cd ..

echo ""
echo "========================================="
echo "✅ SUCCESS! Clean installation complete"
echo "========================================="
echo ""
echo "What was done:"
echo "✓ Removed old node_modules"
echo "✓ Removed old package-lock.json"
echo "✓ Removed Next.js cache"
echo "✓ Installed fresh dependencies"
echo ""
echo "The deprecation warnings should now be minimal or gone."
echo ""
