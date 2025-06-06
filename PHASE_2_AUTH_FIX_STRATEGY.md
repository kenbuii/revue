# 🔧 Phase 2: Authentication Context Fix Strategy

## **🎯 Root Cause Confirmed**
**All 3 regressions stem from authentication context being NULL in database queries.**

---

## **🚀 Targeted Fix Plan**

### **Fix 1: Comments Service Authentication (5 minutes)**
**Issue**: RPC calls return `null` when `auth.uid()` is `NULL`

**Solution**: Fix authentication headers in `commentsService.ts`

**Files to Update:**
- `lib/commentsService.ts` - Fix RPC authentication headers
- Add proper error handling for auth failures

**Expected Result**: Comments can be posted successfully

### **Fix 2: Profile Service Authentication (5 minutes)**  
**Issue**: Profile queries fail due to authentication context

**Solution**: Fix authentication in profile-related services

**Files to Update:**
- `lib/userProfile.ts` - Fix authentication context
- Profile page components - Add loading states for auth

**Expected Result**: Profile shows name, username, and media preferences

### **Fix 3: Post Detail Authentication (5 minutes)**
**Issue**: Post detail queries fail, causing fallback to test data

**Solution**: Fix authentication in post services and navigation

**Files to Update:**
- `app/post/[id].tsx` - Fix authentication context
- `lib/posts.ts` - Ensure proper auth headers

**Expected Result**: Post details show real data with author info

---

## **🔧 Implementation Details**

### **Authentication Header Fix Pattern**
```typescript
// BEFORE (Broken)
const token = session.data.session?.access_token || this.supabaseAnonKey;

// AFTER (Fixed)  
const token = session.data.session?.access_token;
if (!token) {
  throw new Error('Authentication required');
}
```

### **Service Layer Pattern**
```typescript
// Add to all service methods
private async ensureAuthenticated() {
  const session = await supabaseAuth.getSession();
  if (!session.data.session?.access_token) {
    throw new Error('User not authenticated');
  }
  return session.data.session.access_token;
}
```

### **Error Handling Pattern**
```typescript
// Add graceful fallbacks
try {
  const data = await serviceCall();
  return data;
} catch (error) {
  if (error.message.includes('authentication')) {
    // Handle auth errors gracefully
    console.log('Authentication required');
    return null;
  }
  throw error;
}
```

---

## **📋 Detailed Implementation**

### **Step 1: Fix Comments Authentication**

**Problem**: `create_comment` RPC returns `null` due to auth context

**Root Issue**: Authentication headers not properly passed to RPC calls

**Fix**: Update `lib/commentsService.ts` authentication

```typescript
private async callRPC(functionName: string, params: any = {}) {
  const session = await supabaseAuth.getSession();
  
  // FIXED: Ensure we have valid auth token
  if (!session.data.session?.access_token) {
    throw new Error('Authentication required for comments');
  }
  
  const token = session.data.session.access_token;
  
  const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'apikey': this.supabaseAnonKey!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  // FIXED: Better error handling
  if (!response.ok) {
    const error = await response.text();
    console.error(`RPC call failed: ${response.status} - ${error}`);
    throw new Error(`Failed to ${functionName}: ${error}`);
  }

  const result = await response.json();
  
  // FIXED: Handle null results gracefully
  if (result === null) {
    throw new Error(`${functionName} returned null - check authentication`);
  }
  
  return result;
}
```

### **Step 2: Fix Profile Authentication**

**Problem**: Profile services can't fetch user data due to auth failures

**Fix**: Update authentication context in profile services

### **Step 3: Fix Post Detail Authentication**

**Problem**: Post detail queries fail, causing fallback to test data

**Fix**: Ensure proper authentication in post detail fetching

---

## **⚡ Quick Implementation Order**

1. **Fix commentsService authentication** (highest impact)
2. **Fix profile services authentication** (core functionality)
3. **Fix post detail authentication** (navigation flow)
4. **Test end-to-end** (verify no new regressions)

---

## **✅ Success Criteria**

### **Comments Fixed:**
- [ ] Can post comments without "Cannot read property 'success' of null" error
- [ ] Comments appear immediately after posting
- [ ] Comment counts update properly

### **Profile Fixed:**
- [ ] Profile page shows real username and display name
- [ ] Media preferences display correctly (5 items)
- [ ] Profile loads without authentication errors

### **Post Details Fixed:**
- [ ] Clicking post shows real author name and content
- [ ] Media information displays correctly
- [ ] Comments and likes work on post detail page

### **No New Regressions:**
- [ ] Infinite scroll still works
- [ ] Feed refresh still works  
- [ ] Navigation still works
- [ ] Post creation still works

---

## **🚨 Rollback Plan**

If fixes cause new issues:
1. **Revert authentication changes**
2. **Test with previous working state**
3. **Apply fixes incrementally**
4. **Use debug components to identify specific failures**

---

**This focused approach targets the authentication root cause rather than treating symptoms, ensuring all three issues are resolved together.** 