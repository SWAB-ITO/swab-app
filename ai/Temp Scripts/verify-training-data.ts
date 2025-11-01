import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const backupFilePath = '/Users/calebsandler/Downloads/training_1_backup.csv';

async function verifyTrainingData() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n=== TRAINING DATA VERIFICATION ===\n');

  // 1. Get current database state
  console.log('📊 Current Database State:');
  const { data: allMentors, error } = await supabase
    .from('mentors')
    .select('mn_id, training_done, training_at, first_name, last_name, phone')
    .order('mn_id');

  if (error) {
    console.error('Error fetching mentors:', error);
    return;
  }

  const currentTotal = allMentors?.length || 0;
  const currentTrainingTrue = allMentors?.filter(m => m.training_done === true).length || 0;
  const currentTrainingFalse = allMentors?.filter(m => m.training_done === false).length || 0;
  const currentWithTimestamp = allMentors?.filter(m => m.training_at !== null).length || 0;

  console.log(`  Total mentors: ${currentTotal}`);
  console.log(`  Training done = true: ${currentTrainingTrue}`);
  console.log(`  Training done = false: ${currentTrainingFalse}`);
  console.log(`  With training_at timestamp: ${currentWithTimestamp}`);

  // 2. Read backup file to compare
  console.log('\n📁 Backup File State:');
  const csvContent = fs.readFileSync(backupFilePath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');

  const mnIdIndex = headers.indexOf('mn_id');
  const trainingDoneIndex = headers.indexOf('training_done');
  const trainingAtIndex = headers.indexOf('training_at');

  const backupData = new Map<string, { training_done: boolean; training_at: string | null }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',');
    const mn_id = columns[mnIdIndex];

    if (!mn_id || !mn_id.startsWith('MN')) continue;

    backupData.set(mn_id, {
      training_done: columns[trainingDoneIndex] === 'true',
      training_at: columns[trainingAtIndex] && columns[trainingAtIndex] !== '' ? columns[trainingAtIndex] : null
    });
  }

  const backupTotal = backupData.size;
  const backupTrainingTrue = Array.from(backupData.values()).filter(v => v.training_done === true).length;
  const backupWithTimestamp = Array.from(backupData.values()).filter(v => v.training_at !== null).length;

  console.log(`  Total mentors in backup: ${backupTotal}`);
  console.log(`  Training done = true: ${backupTrainingTrue}`);
  console.log(`  With training_at timestamp: ${backupWithTimestamp}`);

  // 3. Compare and find mismatches
  console.log('\n🔍 Comparison Results:');

  const mismatches: Array<{
    mn_id: string;
    name: string;
    backup_training_done: boolean;
    current_training_done: boolean;
    backup_training_at: string | null;
    current_training_at: string | null;
  }> = [];

  const mentorsInBackupNotInDB: string[] = [];
  const mentorsInDBNotInBackup: string[] = [];

  // Check each mentor in backup
  for (const [mn_id, backupValues] of backupData) {
    const currentMentor = allMentors?.find(m => m.mn_id === mn_id);

    if (!currentMentor) {
      mentorsInBackupNotInDB.push(mn_id);
      continue;
    }

    // Check for mismatches
    const trainingDoneMismatch = currentMentor.training_done !== backupValues.training_done;
    const trainingAtMismatch = currentMentor.training_at !== backupValues.training_at;

    if (trainingDoneMismatch || trainingAtMismatch) {
      mismatches.push({
        mn_id,
        name: `${currentMentor.first_name} ${currentMentor.last_name}`,
        backup_training_done: backupValues.training_done,
        current_training_done: currentMentor.training_done,
        backup_training_at: backupValues.training_at,
        current_training_at: currentMentor.training_at,
      });
    }
  }

  // Check for mentors in DB but not in backup
  allMentors?.forEach(mentor => {
    if (!backupData.has(mentor.mn_id)) {
      mentorsInDBNotInBackup.push(mentor.mn_id);
    }
  });

  console.log(`  ✓ Mentors matching: ${backupData.size - mismatches.length - mentorsInBackupNotInDB.length}`);
  console.log(`  ✗ Mismatches found: ${mismatches.length}`);
  console.log(`  ℹ️ New mentors (in DB, not in backup): ${mentorsInDBNotInBackup.length}`);
  console.log(`  ⚠️ Missing mentors (in backup, not in DB): ${mentorsInBackupNotInDB.length}`);

  // 4. Show detailed mismatches
  if (mismatches.length > 0) {
    console.log('\n❌ MISMATCHES DETECTED:');
    console.log('='.repeat(100));
    mismatches.slice(0, 20).forEach(m => {
      console.log(`\n  ${m.mn_id} (${m.name})`);
      console.log(`    Backup:  training_done=${m.backup_training_done}, training_at=${m.backup_training_at}`);
      console.log(`    Current: training_done=${m.current_training_done}, training_at=${m.current_training_at}`);
    });
    if (mismatches.length > 20) {
      console.log(`\n  ... and ${mismatches.length - 20} more mismatches`);
    }
  } else {
    console.log('\n✅ All training data matches backup!');
  }

  // 5. Show sample of correctly preserved records
  console.log('\n✅ Sample of Correctly Preserved Records:');
  const correctMatches = allMentors?.filter(m => {
    const backup = backupData.get(m.mn_id);
    return backup &&
           m.training_done === backup.training_done &&
           m.training_at === backup.training_at &&
           m.training_done === true; // Show only those with training done
  }).slice(0, 5);

  correctMatches?.forEach(m => {
    console.log(`  ${m.mn_id} (${m.first_name} ${m.last_name}): training_done=${m.training_done}, training_at=${m.training_at}`);
  });

  // 6. Show new mentors (if any)
  if (mentorsInDBNotInBackup.length > 0) {
    console.log(`\n📝 New Mentors Added Since Backup (${mentorsInDBNotInBackup.length} total):`);
    mentorsInDBNotInBackup.slice(0, 5).forEach(mn_id => {
      const mentor = allMentors?.find(m => m.mn_id === mn_id);
      if (mentor) {
        console.log(`  ${mn_id} (${mentor.first_name} ${mentor.last_name}): training_done=${mentor.training_done}`);
      }
    });
    if (mentorsInDBNotInBackup.length > 5) {
      console.log(`  ... and ${mentorsInDBNotInBackup.length - 5} more new mentors`);
    }
  }

  // 7. Summary
  console.log('\n' + '='.repeat(100));
  console.log('📈 SUMMARY');
  console.log('='.repeat(100));

  const expectedTrainingTrue = backupTrainingTrue;
  const actualTrainingTrue = currentTrainingTrue;

  if (actualTrainingTrue >= expectedTrainingTrue) {
    console.log(`✅ SUCCESS: Training data preserved!`);
    console.log(`   Expected at least ${expectedTrainingTrue} mentors with training_done=true`);
    console.log(`   Found ${actualTrainingTrue} mentors with training_done=true`);
    if (actualTrainingTrue > expectedTrainingTrue) {
      console.log(`   ${actualTrainingTrue - expectedTrainingTrue} additional mentors marked as trained (likely new mentors)`);
    }
  } else {
    console.log(`❌ PROBLEM: Training data NOT fully preserved!`);
    console.log(`   Expected ${expectedTrainingTrue} mentors with training_done=true`);
    console.log(`   Found only ${actualTrainingTrue} mentors with training_done=true`);
    console.log(`   Missing: ${expectedTrainingTrue - actualTrainingTrue} mentors`);
  }

  if (mismatches.length === 0 && mentorsInBackupNotInDB.length === 0) {
    console.log(`✅ All backup data correctly preserved in database`);
  }

  console.log();
}

verifyTrainingData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
