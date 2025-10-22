// sync-members.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ======= CONFIG =======
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======= Helper =======
function generateTempPasscode() {
  return "welcome"; // change this if you want random passwords
}

// ======= Main Function =======
async function syncMembersToAuth() {
  // 1. Get all members without a linked Auth user
  const { data: members, error: selectError } = await supabase
    .from('members')
    .select('*')
    .is('user_id', null);

  if (selectError) throw selectError;
  if (!members.length) {
    console.log('No members found without user_id.');
    return;
  }

  // 2. Loop through members and create Auth users
  for (const member of members) {
    const tempPassword = generateTempPasscode();

    // Create Auth user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: tempPassword,
      email_confirm: true
    });

    if (userError) {
      console.error(`Failed to create Auth user for ${member.email}: ${userError.message}`);
      continue;
    }

    // 3. Update the members table with user_id
    const { error: updateError } = await supabase
      .from('members')
      .update({ user_id: user.user.id })
      .eq('member_id', member.member_id); // use member_id as primary key

    if (updateError) {
      console.error(`Failed to update members table for ${member.email}: ${updateError.message}`);
      continue;
    }

    // 4. Output email + temp password
    console.log(`${member.email},${tempPassword}`);
  }

  console.log('All members synced to Auth successfully!');
}

// Run the sync
syncMembersToAuth().catch(console.error);