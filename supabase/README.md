# Supabase Files Organization

This directory contains all SQL and JavaScript diagnostic/debug files organized by their actual effectiveness.

## Structure

```
supabase/
├── supabase_sql/
│   ├── working/     # SQL files that actually work
│   └── broken/      # SQL files that failed or only partially worked
└── supabase_tests/
    ├── working/     # Test files that actually work
    └── broken/      # Test files that failed or were part of problematic cycles
```

## Working Files (Actually Functional)

### supabase_sql/working/
- `check_current_state.sql` - Current diagnostic script (actively used)
- `complete_schema_with_functions.sql` - Current working database schema

### supabase_tests/working/
- `check_database.js` - Basic database connectivity test
- `test_connection.js` - Simple connection verification

## Broken Files (Failed or Problematic)

### supabase_sql/broken/
Contains 28 SQL files that were part of failed fix attempts, including:
- All parameter mismatch fixes (v1, v2, v3, nuclear)
- All onboarding function fixes
- All bookmark/bookshelf function fixes
- All trigger fixes
- Files that seemed to work initially but had remaining issues

### supabase_tests/broken/
Contains 32 JavaScript test files that were part of problematic diagnostic cycles, including:
- All comprehensive diagnosis attempts
- All verification scripts that didn't actually verify success
- All debug files from failed periods
- Files that were part of the "ad-hoc fixes" cycle

## Key Insight

Based on conversation history analysis, most files that initially seemed successful were later revealed to have remaining issues. Only files that are:
1. Currently being used for diagnosis
2. Basic baseline functionality
3. Simple connectivity tests

...are classified as "working."

## Next Steps

For future database work:
1. Start with the working schema (`complete_schema_with_functions.sql`)
2. Use the current diagnostic (`check_current_state.sql`) to understand state
3. Avoid complex, iterative fixes that created the problems in the broken/ folders
4. Focus on simple, targeted solutions 