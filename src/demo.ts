/**
 * Voice MCP Hub - Demo
 * Demonstrates the three main use cases from the design document
 */

import { voiceHub } from './index.js';

async function demo() {
  console.log('='.repeat(80));
  console.log('Voice MCP Hub - Demo');
  console.log('='.repeat(80));

  // Create a session
  const session = voiceHub.createSession();
  console.log(`\n📱 Created session: ${session.id}\n`);

  // Add delay between demos
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Demo A: Single Action - Calendar Add
  console.log('\n' + '='.repeat(80));
  console.log('Demo A: Single Action - Add Calendar Event');
  console.log('='.repeat(80));
  console.log('User: "明日10時、田中さんと30分ミーティング入れて"\n');

  await voiceHub.processUtterance(
    session.id,
    '明日10時、田中さんと30分ミーティング入れて'
  );

  await delay(3000);

  // Demo B: Barge-in - Update Calendar Event
  console.log('\n' + '='.repeat(80));
  console.log('Demo B: Barge-in - Update Event Time');
  console.log('='.repeat(80));
  console.log('User: "やっぱ11時で"\n');

  await voiceHub.processUtterance(session.id, 'やっぱ11時で');

  await delay(2000);

  // Demo C: Multiple App Integration - Memo + Task
  console.log('\n' + '='.repeat(80));
  console.log('Demo C: Multiple App Integration - Memo + Task');
  console.log('='.repeat(80));
  console.log('User: "重要な会議のメモして"\n');

  await voiceHub.processUtterance(session.id, '重要な会議のメモして');

  await delay(2000);

  console.log('\nUser: "午後に読むってタスク入れて"\n');

  await voiceHub.processUtterance(session.id, '午後に読むってタスク入れて');

  await delay(2000);

  // Additional demos
  console.log('\n' + '='.repeat(80));
  console.log('Additional Demos');
  console.log('='.repeat(80));

  console.log('\nUser: "タスク一覧見せて"\n');
  await voiceHub.processUtterance(session.id, 'タスク一覧見せて');
  await delay(2000);

  console.log('\nUser: "会議に関するメモ検索して"\n');
  await voiceHub.processUtterance(session.id, '会議に関するメモ検索して');
  await delay(2000);

  // Show session info
  console.log('\n' + '='.repeat(80));
  console.log('Session Summary');
  console.log('='.repeat(80));

  const finalSession = voiceHub.getSession(session.id);
  console.log('\nSession Info:');
  console.log(`  ID: ${finalSession?.id}`);
  console.log(`  State: ${finalSession?.state}`);
  console.log(`  Turn Count: ${finalSession?.context.turn_count}`);
  console.log(`  Last Intent: ${finalSession?.context.last_intent}`);

  // Show event log
  console.log('\nEvent Log (last 10):');
  const eventLog = voiceHub.getEventBus().getEventLog(10);
  eventLog.forEach((log, i) => {
    console.log(`  ${i + 1}. [${log.topic}] ${log.timestamp}`);
  });

  // Show call history
  console.log('\nMCP Call History:');
  const callHistory = voiceHub.getOrchestrator().getCallHistory();
  callHistory.forEach((call, i) => {
    console.log(`  ${i + 1}. ${call.capability} - ${call.status} (${call.timestamp})`);
  });

  // Close session
  console.log('\n' + '='.repeat(80));
  voiceHub.closeSession(session.id);
  console.log(`✅ Session closed: ${session.id}`);
  console.log('='.repeat(80) + '\n');
}

// Run demo
demo().catch(console.error);
