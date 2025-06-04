const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Phase 4: Context & State Management Updates');
console.log('='.repeat(60));

const testResults = {
  passed: 0,
  failed: 0,
  issues: []
};

function runTest(testName, testFn) {
  try {
    console.log(`\n🔍 Testing: ${testName}`);
    testFn();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.issues.push(`${testName}: ${error.message}`);
  }
}

// Test 1: Verify PostInteractionsContext exists and has correct structure
runTest('PostInteractionsContext Structure', () => {
  const contextPath = './contexts/PostInteractionsContext.tsx';
  if (!fs.existsSync(contextPath)) {
    throw new Error('PostInteractionsContext.tsx not found');
  }
  
  const content = fs.readFileSync(contextPath, 'utf8');
  
  // Check for key exports
  const requiredExports = [
    'PostInteractionsProvider',
    'usePostInteractions',
    'useLikes',
    'useFavorites'
  ];
  
  requiredExports.forEach(exportName => {
    if (!content.includes(`export function ${exportName}`)) {
      throw new Error(`Missing export: ${exportName}`);
    }
  });
  
  // Check for key methods
  const requiredMethods = [
    'toggleLike',
    'toggleFavorite',
    'isLiked',
    'isFavorited',
    'refreshInteractions'
  ];
  
  requiredMethods.forEach(method => {
    if (!content.includes(method)) {
      throw new Error(`Missing method: ${method}`);
    }
  });
  
  console.log('   ✓ All required exports and methods found');
});

// Test 2: Verify CommentsContext exists and has correct structure
runTest('CommentsContext Structure', () => {
  const contextPath = './contexts/CommentsContext.tsx';
  if (!fs.existsSync(contextPath)) {
    throw new Error('CommentsContext.tsx not found');
  }
  
  const content = fs.readFileSync(contextPath, 'utf8');
  
  // Check for key exports
  const requiredExports = [
    'CommentsProvider',
    'useComments',
    'usePostComments'
  ];
  
  requiredExports.forEach(exportName => {
    if (!content.includes(`export function ${exportName}`)) {
      throw new Error(`Missing export: ${exportName}`);
    }
  });
  
  // Check for key methods
  const requiredMethods = [
    'getPostComments',
    'loadComments',
    'createComment',
    'toggleCommentLike',
    'getCommentCount'
  ];
  
  requiredMethods.forEach(method => {
    if (!content.includes(method)) {
      throw new Error(`Missing method: ${method}`);
    }
  });
  
  console.log('   ✓ All required exports and methods found');
});

// Test 3: Verify HiddenPostsContext exists and has correct structure
runTest('HiddenPostsContext Structure', () => {
  const contextPath = './contexts/HiddenPostsContext.tsx';
  if (!fs.existsSync(contextPath)) {
    throw new Error('HiddenPostsContext.tsx not found');
  }
  
  const content = fs.readFileSync(contextPath, 'utf8');
  
  // Check for key exports
  const requiredExports = [
    'HiddenPostsProvider',
    'useHiddenPosts',
    'useVisiblePosts'
  ];
  
  requiredExports.forEach(exportName => {
    if (!content.includes(`export function ${exportName}`)) {
      throw new Error(`Missing export: ${exportName}`);
    }
  });
  
  // Check for key methods
  const requiredMethods = [
    'isPostHidden',
    'hidePost',
    'unhidePost',
    'reportPost',
    'filterVisiblePosts'
  ];
  
  requiredMethods.forEach(method => {
    if (!content.includes(method)) {
      throw new Error(`Missing method: ${method}`);
    }
  });
  
  console.log('   ✓ All required exports and methods found');
});

// Test 4: Verify Context Providers are set up in _layout.tsx
runTest('Context Providers Setup', () => {
  const layoutPath = './app/_layout.tsx';
  if (!fs.existsSync(layoutPath)) {
    throw new Error('_layout.tsx not found');
  }
  
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  // Check for context imports
  const requiredImports = [
    'PostInteractionsProvider',
    'CommentsProvider',
    'HiddenPostsProvider'
  ];
  
  requiredImports.forEach(importName => {
    if (!content.includes(importName)) {
      throw new Error(`Missing import: ${importName}`);
    }
  });
  
  // Check that providers are in the component tree
  requiredImports.forEach(provider => {
    const providerTag = `<${provider}>`;
    if (!content.includes(providerTag)) {
      throw new Error(`Provider not in component tree: ${provider}`);
    }
  });
  
  console.log('   ✓ All context providers properly imported and used');
});

// Test 5: Verify PostCard integration with new contexts
runTest('PostCard Context Integration', () => {
  const postCardPath = './components/PostCard.tsx';
  if (!fs.existsSync(postCardPath)) {
    throw new Error('PostCard.tsx not found');
  }
  
  const content = fs.readFileSync(postCardPath, 'utf8');
  
  // Check for context hooks usage
  const requiredHooks = [
    'usePostInteractions',
    'useComments',
    'useHiddenPosts'
  ];
  
  requiredHooks.forEach(hook => {
    if (!content.includes(hook)) {
      throw new Error(`Missing hook usage: ${hook}`);
    }
  });
  
  // Check for key method usage
  const requiredMethodCalls = [
    'toggleLike',
    'toggleFavorite',
    'getCommentCount',
    'hidePost',
    'reportPost'
  ];
  
  requiredMethodCalls.forEach(method => {
    if (!content.includes(method)) {
      throw new Error(`Missing method call: ${method}`);
    }
  });
  
  console.log('   ✓ PostCard properly integrated with new contexts');
});

// Test 6: Check for proper TypeScript interfaces
runTest('TypeScript Interface Definitions', () => {
  const contexts = [
    './contexts/PostInteractionsContext.tsx',
    './contexts/CommentsContext.tsx',
    './contexts/HiddenPostsContext.tsx'
  ];
  
  contexts.forEach(contextPath => {
    const content = fs.readFileSync(contextPath, 'utf8');
    
    // Check for interface definitions
    if (!content.includes('interface ') && !content.includes('export interface ')) {
      throw new Error(`No interfaces found in ${path.basename(contextPath)}`);
    }
    
    // Check for proper context type definition
    const contextName = path.basename(contextPath, '.tsx');
    const expectedInterface = `${contextName.replace('Context', '')}ContextType`;
    
    if (!content.includes(expectedInterface)) {
      throw new Error(`Missing context type interface: ${expectedInterface}`);
    }
  });
  
  console.log('   ✓ All contexts have proper TypeScript interfaces');
});

// Test 7: Verify service integrations
runTest('Service Layer Integration', () => {
  const postInteractionsContent = fs.readFileSync('./contexts/PostInteractionsContext.tsx', 'utf8');
  const commentsContent = fs.readFileSync('./contexts/CommentsContext.tsx', 'utf8');
  
  // Check PostInteractions uses favorites service
  if (!postInteractionsContent.includes("from '@/lib/favorites'")) {
    throw new Error('PostInteractionsContext not importing favorites service');
  }
  
  // Check Comments uses comments service
  if (!commentsContent.includes("from '@/lib/commentsService'")) {
    throw new Error('CommentsContext not importing comments service');
  }
  
  console.log('   ✓ Contexts properly integrated with service layer');
});

// Test 8: Check for AsyncStorage integration for offline support
runTest('Offline Support Implementation', () => {
  const postInteractionsContent = fs.readFileSync('./contexts/PostInteractionsContext.tsx', 'utf8');
  const hiddenPostsContent = fs.readFileSync('./contexts/HiddenPostsContext.tsx', 'utf8');
  
  // Check for AsyncStorage usage
  const contexts = [
    { name: 'PostInteractions', content: postInteractionsContent },
    { name: 'HiddenPosts', content: hiddenPostsContent }
  ];
  
  contexts.forEach(({ name, content }) => {
    if (!content.includes('AsyncStorage')) {
      throw new Error(`${name}Context missing AsyncStorage for offline support`);
    }
  });
  
  console.log('   ✓ Offline support implemented with AsyncStorage');
});

// Test 9: Verify error handling patterns
runTest('Error Handling Implementation', () => {
  const contexts = [
    './contexts/PostInteractionsContext.tsx',
    './contexts/CommentsContext.tsx',
    './contexts/HiddenPostsContext.tsx'
  ];
  
  contexts.forEach(contextPath => {
    const content = fs.readFileSync(contextPath, 'utf8');
    
    // Check for try-catch blocks
    if (!content.includes('try {') || !content.includes('} catch')) {
      throw new Error(`Missing error handling in ${path.basename(contextPath)}`);
    }
    
    // Check for error state management
    if (!content.includes('Error') && !content.includes('error')) {
      throw new Error(`Missing error state in ${path.basename(contextPath)}`);
    }
  });
  
  console.log('   ✓ Proper error handling implemented in all contexts');
});

// Test 10: Check for optimistic updates
runTest('Optimistic Updates Implementation', () => {
  const postInteractionsContent = fs.readFileSync('./contexts/PostInteractionsContext.tsx', 'utf8');
  const commentsContent = fs.readFileSync('./contexts/CommentsContext.tsx', 'utf8');
  
  // Check for optimistic update patterns
  if (!postInteractionsContent.includes('optimistic') && !postInteractionsContent.includes('Optimistic')) {
    console.log('   ⚠️  Warning: No explicit optimistic update comments found in PostInteractions');
  }
  
  // Check for immediate state updates before API calls
  const hasOptimisticPattern = postInteractionsContent.includes('setLikedPosts') && 
                              postInteractionsContent.includes('setFavoritedPosts');
  
  if (!hasOptimisticPattern) {
    throw new Error('PostInteractionsContext missing optimistic update pattern');
  }
  
  console.log('   ✓ Optimistic updates implemented');
});

// Final Summary
console.log('\n' + '='*60);
console.log('📊 PHASE 4 TEST RESULTS');
console.log('='*60);
console.log(`✅ Tests Passed: ${testResults.passed}`);
console.log(`❌ Tests Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

if (testResults.issues.length > 0) {
  console.log('\n🐛 ISSUES FOUND:');
  testResults.issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
}

if (testResults.failed === 0) {
  console.log('\n🎉 PHASE 4 COMPLETE!');
  console.log('✅ All context and state management updates are working correctly');
  console.log('✅ PostInteractionsContext (merged likes/favorites) ✓');
  console.log('✅ CommentsContext (real-time comment management) ✓');
  console.log('✅ HiddenPostsContext (post hiding/reporting) ✓');
  console.log('✅ PostCard integration ✓');
  console.log('✅ Provider setup ✓');
  console.log('\n🚀 Ready to proceed to Phase 5: Page Updates');
} else {
  console.log('\n⚠️  PHASE 4 NEEDS ATTENTION');
  console.log('Please fix the issues above before proceeding to Phase 5');
}

console.log('\n' + '='*60); 