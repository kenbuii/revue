# Database Migration Strategy

## Problem Statement
We've encountered cycles of bandaid fixes and technical debt when applying database changes due to:
- Conflicting function signatures
- Existing schema elements
- Lack of proper migration versioning
- No rollback strategies

## Solution: Clean Migration Strategy

### 1. **Pre-Migration Audit** ✅
- Always run `supabase/audit_current_schema.sql` first
- Understand what exists before making changes
- Document current state in migration comments

### 2. **Idempotent Migrations** ✅  
- Use `IF NOT EXISTS` for table creation
- Use `DROP IF EXISTS` before function creation
- Check for column existence before adding
- Handle all edge cases within the migration

### 3. **Clean Slate Approach** ✅
- Drop conflicting functions/triggers first
- Recreate everything cleanly
- No partial updates that leave system in inconsistent state

### 4. **Versioned Migrations**
```
supabase/migrations/
├── v1_initial_schema.sql
├── v2_phase1_comments_and_hidden_posts.sql
├── v3_phase2_backend_services.sql
└── v4_phase3_ui_components.sql
```

### 5. **Always Include Rollback** ✅
- Every migration has a corresponding rollback script
- Test rollback before applying migration
- Document what will be lost in rollback

### 6. **Testing Strategy**
- Test migrations on development database first
- Verify functionality after migration
- Test rollback procedure

### 7. **Documentation Strategy**
- Document what each migration does
- Include business context for changes
- Note any breaking changes or dependencies

## Migration Workflow

### Before Any Migration:
1. **Backup Database** (via Supabase dashboard)
2. **Run Audit Script** (`audit_current_schema.sql`)
3. **Review Output** - understand current state
4. **Test on Development** if possible

### Applying Migration:
1. **Use Clean Migration** (`phase1_clean_migration.sql`)
2. **Verify Success** - check success message
3. **Test Core Functionality** - ensure app still works
4. **Document Applied Migration** - note date/version

### If Issues Occur:
1. **Don't Apply Quick Fixes** - avoid bandaid solutions
2. **Use Rollback Script** (`phase1_rollback.sql`)
3. **Investigate Root Cause** - understand what went wrong
4. **Fix Migration Script** - address issues properly
5. **Re-apply Clean Migration**

## Current Status: Phase 1

### Files Created:
- ✅ `audit_current_schema.sql` - Pre-migration audit
- ✅ `phase1_clean_migration.sql` - Clean, idempotent migration
- ✅ `phase1_rollback.sql` - Safe rollback option

### What Phase 1 Adds:
- **Comment likes system** - Users can like/unlike comments
- **Hidden posts system** - Users can hide posts from their feed
- **Auto-updating counts** - Like/comment counts update automatically
- **Database functions** - Clean API for frontend to use

### Next Steps:
1. **Apply Phase 1 Migration** - Use `phase1_clean_migration.sql`
2. **Verify Success** - Check all functions work
3. **Move to Phase 2** - Backend service layer

## Key Principles Going Forward

### ❌ Avoid These Patterns:
- Applying partial fixes
- Ignoring schema conflicts  
- Creating functions without considering existing ones
- Making changes without rollback plan

### ✅ Follow These Patterns:
- Always audit first
- Use idempotent migrations
- Include rollback scripts
- Test before applying to production
- Document all changes

## Breaking the Cycle

This strategy breaks the technical debt cycle by:
1. **Eliminating Conflicts** - Clean slate approach prevents schema conflicts
2. **Enabling Rollbacks** - Always have a way back
3. **Ensuring Consistency** - Idempotent migrations work multiple times
4. **Improving Visibility** - Audit scripts show current state
5. **Reducing Risk** - Test-first approach catches issues early

The extra time spent on proper migrations saves massive amounts of time debugging and fixing broken states later. 