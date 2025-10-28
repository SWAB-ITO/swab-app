import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read CSV file
const backupFilePath = '/Users/calebsandler/Downloads/training_1_backup.csv';

interface TrainingBackupRow {
  mn_id: string;
  training_done: string;
  training_at: string;
}

async function restoreTrainingTimestamps() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Reading backup CSV file...');
  const csvContent = fs.readFileSync(backupFilePath, 'utf-8');
  const lines = csvContent.split('\n');

  // Parse header
  const headers = lines[0].split(',');
  const mnIdIndex = headers.indexOf('mn_id');
  const trainingDoneIndex = headers.indexOf('training_done');
  const trainingAtIndex = headers.indexOf('training_at');

  if (mnIdIndex === -1 || trainingDoneIndex === -1 || trainingAtIndex === -1) {
    throw new Error('Required columns not found in CSV');
  }

  console.log(`Found columns - mn_id: ${mnIdIndex}, training_done: ${trainingDoneIndex}, training_at: ${trainingAtIndex}`);

  const updates: Array<{ mn_id: string; training_done: boolean; training_at: string | null }> = [];
  let skipped = 0;
  let processed = 0;

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',');

    const mn_id = columns[mnIdIndex];
    const training_done = columns[trainingDoneIndex];
    const training_at = columns[trainingAtIndex];

    if (!mn_id || !mn_id.startsWith('MN')) {
      continue;
    }

    processed++;

    // Parse training_done as boolean
    const trainingDone = training_done === 'true';

    // Parse training_at - only include if it has a value
    const trainingAt = training_at && training_at !== '' ? training_at : null;

    updates.push({
      mn_id,
      training_done: trainingDone,
      training_at: trainingAt
    });
  }

  console.log(`\nParsed ${processed} mentor records from backup`);
  console.log(`Found ${updates.length} records to update`);

  // Perform updates
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ mn_id: string; error: string }> = [];

  console.log('\nStarting database updates...');

  for (const update of updates) {
    try {
      const { error } = await supabase
        .from('mentors')
        .update({
          training_done: update.training_done,
          training_at: update.training_at
        })
        .eq('mn_id', update.mn_id);

      if (error) {
        errorCount++;
        errors.push({ mn_id: update.mn_id, error: error.message });
        console.error(`❌ Failed to update ${update.mn_id}: ${error.message}`);
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✓ Updated ${successCount}/${updates.length} records...`);
        }
      }
    } catch (err) {
      errorCount++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ mn_id: update.mn_id, error: errorMsg });
      console.error(`❌ Failed to update ${update.mn_id}: ${errorMsg}`);
    }
  }

  console.log('\n=== Restoration Summary ===');
  console.log(`✓ Successfully updated: ${successCount}`);
  console.log(`✗ Failed updates: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(({ mn_id, error }) => {
      console.log(`  ${mn_id}: ${error}`);
    });
  }

  // Verify some records
  console.log('\n=== Sample Verification ===');
  const sampleIds = updates.slice(0, 3).map(u => u.mn_id);

  for (const mn_id of sampleIds) {
    const { data, error } = await supabase
      .from('mentors')
      .select('mn_id, training_done, training_at')
      .eq('mn_id', mn_id)
      .single();

    if (data) {
      console.log(`${mn_id}: training_done=${data.training_done}, training_at=${data.training_at}`);
    }
  }
}

// Run the restoration
restoreTrainingTimestamps()
  .then(() => {
    console.log('\n✓ Restoration complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ Restoration failed:', err);
    process.exit(1);
  });
