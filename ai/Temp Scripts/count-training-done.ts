import * as fs from 'fs';

const backupFilePath = '/Users/calebsandler/Downloads/training_1_backup.csv';

function countTrainingDone() {
  console.log('Reading backup CSV file...');
  const csvContent = fs.readFileSync(backupFilePath, 'utf-8');
  const lines = csvContent.split('\n');

  // Parse header
  const headers = lines[0].split(',');
  const mnIdIndex = headers.indexOf('mn_id');
  const trainingDoneIndex = headers.indexOf('training_done');
  const trainingAtIndex = headers.indexOf('training_at');

  let trainingDoneTrue = 0;
  let trainingDoneFalse = 0;
  let withTimestamp = 0;
  let withoutTimestamp = 0;

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

    if (training_done === 'true') {
      trainingDoneTrue++;
      if (training_at && training_at !== '') {
        withTimestamp++;
      }
    } else {
      trainingDoneFalse++;
    }

    if (!training_at || training_at === '') {
      withoutTimestamp++;
    }
  }

  console.log('\n=== Training Status Breakdown ===');
  console.log(`Total mentors: ${trainingDoneTrue + trainingDoneFalse}`);
  console.log(`Training done = true: ${trainingDoneTrue}`);
  console.log(`Training done = false: ${trainingDoneFalse}`);
  console.log(`With training_at timestamp: ${withTimestamp}`);
  console.log(`Without training_at timestamp: ${withoutTimestamp}`);
}

countTrainingDone();
