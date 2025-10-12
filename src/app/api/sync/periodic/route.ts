import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

/**
 * API Route: Run Periodic Sync (Tier 2)
 * POST /api/sync/periodic
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (message: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
      };

      try {
        sendUpdate('🔄 Starting periodic sync...');

        // Run orchestrator script
        const child = spawn('tsx', ['backend/core/sync/orchestrator.ts', 'periodic'], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: 'pipe',
        });

        child.stdout?.on('data', (data) => {
          const text = data.toString();
          // Send each line as an update
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
            sendUpdate('✅ Periodic sync completed successfully');
          } else {
            sendUpdate(`❌ Periodic sync failed with code ${code}`);
          }
          controller.close();
        });

        child.on('error', (error) => {
          sendUpdate(`❌ Error: ${error.message}`);
          controller.close();
        });
      } catch (error) {
        sendUpdate(`❌ Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
