/**
 * AP2/X402 Protocol Layer Example
 * Demonstrates chain-agnostic protocol usage with Sui
 */

import { createAP2Intent, hashAP2Intent, formatIntentId } from '../src/protocol/intent_ap2';
import { createX402Trigger, hashX402Trigger, formatPaymentId, linkTriggerToIntent } from '../src/protocol/trigger_x402';

async function ap2X402Example() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  AP2/X402 Protocol Layer - Chain-Agnostic Example        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\\n');

    // Step 1: Create AP2 Intent (Google AP2 Protocol)
    console.log('📄 Step 1: Create AP2 Intent\\n');
    const ap2Intent = createAP2Intent(
        'Analyze social media sentiment for cryptocurrency markets',
        '0.1',  // 0.1 SUI
        [
            'Process 100 recent posts',
            'Classify sentiment',
            'Provide confidence scores',
            'Return JSON results'
        ],
        Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        'SUI'
    );

    console.log('  Intent ID:', formatIntentId(ap2Intent));
    console.log('  Task:', ap2Intent.task_description);
    console.log('  Max Payment:', ap2Intent.max_payment, ap2Intent.payment_token);
    console.log('  Requirements:', ap2Intent.requirements.length, 'conditions');
    console.log('  Intent Hash:', hashAP2Intent(ap2Intent).slice(0, 20) + '...');

    // Step 2: Create X402 Payment Trigger (Coinbase X402 Protocol)
    console.log('\\n💳 Step 2: Create X402 Payment Trigger\\n');
    const recipientAddress = '0x1234567890abcdef'; // Example Sui address

    const x402Trigger = createX402Trigger(
        ap2Intent.intent_id,
        '0.1',
        recipientAddress,
        [
            'Task completion verified',
            'Evidence submitted',
            'Quality check passed'
        ],
        'SUI'
    );

    console.log('  Payment ID:', formatPaymentId(x402Trigger));
    console.log('  Amount:', x402Trigger.amount, x402Trigger.payment_token);
    console.log('  Recipient:', x402Trigger.recipient);
    console.log('  Conditions:', x402Trigger.conditions.length, 'specified');
    console.log('  Payment Hash:', hashX402Trigger(x402Trigger).slice(0, 20) + '...');

    // Step 3: Link Protocols
    console.log('\\n🔗 Step 3: Link AP2 + X402\\n');
    const protocolMetadata = linkTriggerToIntent(x402Trigger, ap2Intent.intent_id);

    console.log('  Protocol Layer:', protocolMetadata.protocol_layer);
    console.log('  AP2 Intent Reference:', protocolMetadata.ap2_intent_reference);
    console.log('  X402 Payment ID:', protocolMetadata.x402_payment_id);

    console.log('\\n✅ AP2/X402 Protocol Integration Complete!');
    console.log('\\nThis protocol layer works with:');
    console.log('  • Sui blockchain (current)');
    console.log('  • Ethereum / EVM chains');
    console.log('  • Solana');
    console.log('  • Any blockchain supporting metadata\\n');
}

if (require.main === module) {
    ap2X402Example().catch(console.error);
}

export default ap2X402Example;
