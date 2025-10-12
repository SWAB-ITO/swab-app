import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { spawn } from 'child_process';

/**
 * API Route: Upload and Process CSV
 *
 * Accepts Givebutter contacts CSV, saves it, and processes it with full matching
 * POST /api/sync/upload-csv
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (message: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
      };

      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
          sendUpdate('❌ Error: No file uploaded');
          controller.close();
          return;
        }

        // Validate file type
        if (!file.name.endsWith('.csv')) {
          sendUpdate('❌ Error: Only CSV files are allowed');
          controller.close();
          return;
        }

        sendUpdate(`📄 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

        // Read file contents
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure data directory exists
        const dataDir = resolve(process.cwd(), 'backend/data');
        await mkdir(dataDir, { recursive: true });

        // Save to backend/data directory with timestamped filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `givebutter-contacts-${timestamp}.csv`;
        const filePath = resolve(dataDir, filename);
        await writeFile(filePath, buffer);

        sendUpdate(`✅ File saved: ${filename}`);
        sendUpdate('');
        sendUpdate('🔄 Processing CSV with contact matching...');
        sendUpdate('');

        // Run upload script
        const child = spawn('tsx', ['backend/core/sync/upload-gb-csv.ts', filePath], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: 'pipe',
        });

        child.stdout?.on('data', (data) => {
          const text = data.toString();
          text.split('\n').forEach((line: string) => {
            if (line.trim()) {
              sendUpdate(line);
            }
          });
        });

        child.stderr?.on('data', (data) => {
          const text = data.toString();
          sendUpdate(`⚠️ ${text}`);
        });

        child.on('close', (code) => {
          if (code === 0) {
            sendUpdate('');
            sendUpdate('✅ CSV processing completed successfully');
          } else {
            sendUpdate('');
            sendUpdate(`❌ CSV processing failed with code ${code}`);
          }
          controller.close();
        });

        child.on('error', (error) => {
          sendUpdate(`❌ Error: ${error.message}`);
          controller.close();
        });
      } catch (error) {
        sendUpdate(`❌ Failed to process CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
