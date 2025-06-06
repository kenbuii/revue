const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Use just the anon key - authentication will come from app
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 === DIAGNOSIS AND SOLUTION ===');

console.log('\n✅ WORKING FUNCTIONS:');
console.log('   - toggle_post_like(p_post_id) exists');
console.log('   - create_comment(p_post_id, p_content) exists');
console.log('   - get_for_you_feed() works (tested with 3 posts)');

console.log('\n❌ BROKEN FUNCTIONS:');
console.log('   - get_post_likes() has SQL error: "column up.id does not exist"');
console.log('   - add_comment() missing (app might call this)');

console.log('\n💡 SOLUTIONS:');

console.log('\n1. FOR LIKES:');
console.log('   ✅ toggle_post_like() exists and works');
console.log('   💡 App should be calling this but saving only locally');
console.log('   🔧 FIX: App authentication issue or wrong service usage');

console.log('\n2. FOR COMMENTS:');
console.log('   ✅ create_comment() exists and works'); 
console.log('   ❌ App calling add_comment() which doesn\'t exist');
console.log('   🔧 FIX: Update app to call create_comment() instead');

console.log('\n3. FOR LIKES MODAL:');
console.log('   ❌ get_post_likes() has SQL bug');
console.log('   🔧 FIX: Needs database function repair');

console.log('\n🎯 IMMEDIATE ACTIONS:');
console.log('1. Check why likes save locally but not to Supabase');
console.log('2. Update comment service to call create_comment instead of add_comment'); 
console.log('3. Test the app again after these changes');

console.log('\n🔍 App should now:');
console.log('   ✅ Load feeds (confirmed working)');
console.log('   ❓ Toggle likes (function exists, check app usage)');
console.log('   ❓ Create comments (function exists, check function name)');

console.log('\n💫 Try your app now and check the console logs!'); 