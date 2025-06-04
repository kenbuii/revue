#!/bin/bash

echo "🔧 Setting up deep diagnosis environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from your project root directory"
    exit 1
fi

# Install required dependency if not already installed
echo "📦 Installing @supabase/supabase-js if needed..."
npm install @supabase/supabase-js

# Check if environment variables are set
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️  EXPO_PUBLIC_SUPABASE_URL not set"
    echo "   You can set it temporarily: export EXPO_PUBLIC_SUPABASE_URL='your_url'"
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY not set"
    echo "   You can set it temporarily: export EXPO_PUBLIC_SUPABASE_ANON_KEY='your_key'"
fi

echo "🚀 Running deep diagnosis..."
node deep_diagnosis.js

echo "🏁 Diagnosis complete!" 