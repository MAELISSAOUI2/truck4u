#!/bin/bash

echo "🔍 TRUCK4U - Verification Script"
echo "================================"
echo ""

# Check 1: Git status
echo "1️⃣ Checking Git status..."
git log --oneline -1
echo ""

# Check 2: Verify shadcn components
echo "2️⃣ Checking shadcn/ui components..."
if [ -f "apps/web/components/ui/button.tsx" ]; then
    echo "✅ button.tsx exists"
else
    echo "❌ button.tsx NOT found"
fi

if [ -f "apps/web/components/ui/card.tsx" ]; then
    echo "✅ card.tsx exists"
else
    echo "❌ card.tsx NOT found"
fi

if [ -f "apps/web/components/ui/input.tsx" ]; then
    echo "✅ input.tsx exists"
else
    echo "❌ input.tsx NOT found"
fi
echo ""

# Check 3: Verify login page uses shadcn
echo "3️⃣ Checking login page imports..."
if grep -q "from '@/components/ui/button'" apps/web/app/customer/login/page.tsx; then
    echo "✅ Login page uses shadcn Button"
else
    echo "❌ Login page NOT using shadcn Button"
fi

if grep -q "from '@/components/ui/input'" apps/web/app/customer/login/page.tsx; then
    echo "✅ Login page uses shadcn Input"
else
    echo "❌ Login page NOT using shadcn Input"
fi
echo ""

# Check 4: Verify globals.css has CSS variables
echo "4️⃣ Checking globals.css..."
if grep -qi "uber.*inspired" apps/web/app/globals.css; then
    echo "✅ globals.css updated with Uber design"
else
    echo "❌ globals.css NOT updated"
fi

if grep -q "\-\-primary:" apps/web/app/globals.css; then
    echo "✅ CSS variables configured"
else
    echo "❌ CSS variables NOT found"
fi
echo ""

# Check 5: Verify NO framer-motion in login
echo "5️⃣ Checking for removed animations..."
if grep -q "framer-motion" apps/web/app/customer/login/page.tsx; then
    echo "⚠️  WARNING: framer-motion still imported in login page"
else
    echo "✅ framer-motion removed from login page"
fi
echo ""

# Summary
echo "================================"
echo "✨ Verification Complete!"
echo ""
echo "Next steps:"
echo "1. rm -rf apps/web/.next"
echo "2. cd apps/web && npm run dev"
echo "3. Hard refresh browser (Ctrl+Shift+R)"
echo ""
