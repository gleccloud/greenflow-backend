/**
 * Code Examples Tab - Complete workflow recipes by persona
 */

import { useState } from 'react';
import { Copy, Check, Truck, Package, BarChart3, Shield, Radio, ChevronDown } from 'lucide-react';

function CopyButton({ text, id, copiedId, onCopy }: { text: string; id: string; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="p-1.5 text-slate-400 hover:text-white transition-colors"
      title="Copy to clipboard"
    >
      {copiedId === id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({ code, id, language, copiedId, onCopy }: { code: string; id: string; language: string; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs text-slate-400">{language}</span>
        <CopyButton text={code} id={id} copiedId={copiedId} onCopy={onCopy} />
      </div>
      <pre className="p-4 text-sm text-slate-300 overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}

interface Example {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  code: string;
}

const EXAMPLES: Example[] = [
  {
    id: 'shipper',
    title: 'Shipper: Create Bid & Evaluate',
    description: 'Create a logistics bid, wait for carrier proposals, run multi-factor evaluation, and award the winner.',
    icon: <Package className="w-5 h-5" />,
    code: `import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',
  apiKey: 'glk_live_xxxxxxxxxxxx',
});

// Step 1: Create a bid (입찰 등록)
const bid = await client.bids.createBid({
  title: 'Seoul to Busan 11t Truck',
  cargoType: 'General',
  cargoWeightTonnes: 11,
  originLocation: 'Seoul',
  destinationLocation: 'Busan',
  distanceKm: 400,
  requiredLeadtimeHours: 24,
  budgetMin: 300000,
  budgetMax: 600000,
  // Evaluation weights (must sum to 1.0)
  priceWeight: 0.5,       // 50% price
  leadtimeWeight: 0.2,    // 20% leadtime
  eiWeight: 0.3,          // 30% carbon intensity
  expiresAt: '2026-03-01T00:00:00Z',
});

// Step 2: Publish the bid (DRAFT → OPEN)
await client.bids.publishBid(bid.id);

// Step 3: Wait for carrier proposals...
// Carriers submit proposals via client.bids.createProposal()

// Step 4: Close bidding and run multi-factor evaluation
await client.bids.closeBid(bid.id);

// Fetch proposals that were submitted during the open period
const proposals = await client.bids.listProposals({ bidId: bid.id });

const evaluation = await client.bids.evaluateBid({
  bidId: bid.id,
  budgetMin: 300000,
  budgetMax: 600000,
  requiredLeadtimeHours: 24,
  proposals: proposals.data.map(p => ({
    proposalId: p.id,
    fleetId: p.fleetId,
    proposedPrice: p.proposedPrice,
    estimatedLeadtimeHours: p.estimatedLeadtimeHours,
    fleetEI: p.fleetEI ?? 50,      // gCO₂e/t·km
    fleetEIGrade: p.fleetEIGrade,   // GRADE_1 | GRADE_2 | GRADE_3
    carrierName: p.carrierName,
  })),
  evaluationPolicy: {
    alpha: 0.5,   // 50% price weight
    beta: 0.2,    // 20% leadtime weight
    gamma: 0.3,   // 30% carbon intensity weight
  },
});

console.log(\`Evaluation ID: \${evaluation.evaluationId}\`);
console.log('Ranked proposals:');
for (const p of evaluation.ranked) {
  console.log(\`  #\${p.rank} \${p.carrierName} — Score: \${p.score.toFixed(3)}\`);
  console.log(\`    Price: \${p.scoreBreakdown.priceScore.toFixed(3)} | Leadtime: \${p.scoreBreakdown.leadtimeScore.toFixed(3)} | EI: \${p.scoreBreakdown.eiScore.toFixed(3)}\`);
  console.log(\`    Within budget: \${p.withinBudget} | Meets leadtime: \${p.meetsLeadtime}\`);
}
console.log(\`Recommendations: \${evaluation.recommendations.join(', ')}\`);

// Step 5: Award the top-ranked proposal (낙찰)
const winner = evaluation.bestProposal;
await client.bids.awardBid(bid.id, {
  proposalId: winner.proposalId,
});

// Order is automatically created from the awarded bid`,
  },
  {
    id: 'carrier',
    title: 'Carrier: Submit Proposal',
    description: 'Check fleet EI, browse open bids, submit a proposal with competitive pricing.',
    icon: <Truck className="w-5 h-5" />,
    code: `import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',
  apiKey: 'glk_live_xxxxxxxxxxxx',
});

// Step 1: Check your fleet's carbon intensity
const fleetEI = await client.fleet.getFleetEI('my-fleet-id');
console.log(\`Current EI: \${fleetEI.eiCurrent} gCO\u2082e/t\u00b7km (\${fleetEI.eiGrade})\`);
console.log(\`Trend: \${fleetEI.trendDirection}\`);

// Step 2: View 30-day EI history
const history = await client.fleet.getFleetEIHistory('my-fleet-id', 30);
console.log(\`30-day records: \${history.records.length}\`);

// Step 3: Browse available bids
const openBids = await client.bids.listBids({
  status: 'OPEN',
  page: 1,
  limit: 20,
});

// Step 4: Submit a proposal (투찰)
const proposal = await client.bids.createProposal({
  bidId: openBids.data[0].id,
  fleetId: 'my-fleet-id',
  carrierName: 'Green Logistics Co.',
  proposedPrice: 480000,           // KRW
  estimatedLeadtimeHours: 5.5,
  notes: 'Real-time GPS tracking available',
});
console.log(\`Proposal submitted: \${proposal.id}\`);

// Step 5: Update proposal if needed (before evaluation)
await client.bids.updateProposal(proposal.id, {
  proposedPrice: 460000,  // Lower price for competitiveness
});

// Step 6: Track order after winning
const orders = await client.orders.listOrders({ status: 'CONFIRMED' });
for (const order of orders.data) {
  // Update tracking data during delivery
  await client.orders.updateTrackingData(order.id, {
    actualDistanceKm: 410,
    fuelConsumedLiters: 145,
    pickupActualAt: new Date().toISOString(),
  });
}`,
  },
  {
    id: 'realtime',
    title: 'Real-time: SSE Streaming & Polling',
    description: 'Subscribe to live order, bid, and fleet events using Server-Sent Events or HTTP polling.',
    icon: <Radio className="w-5 h-5" />,
    code: `import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',
  apiKey: 'glk_live_xxxxxxxxxxxx',
});

// === SSE Streaming (recommended for real-time) ===

// Subscribe to all order events
const unsubOrders = client.realtime.subscribeOrders((event) => {
  console.log(\`Order \${event.data.orderId}: \${event.data.status}\`);
  console.log(\`  Updated at: \${event.data.timestamp}\`);
});

// Subscribe to a specific bid's events
const unsubBid = client.realtime.subscribeBids((event) => {
  console.log(\`Bid \${event.data.bidId}: \${event.type}\`);
  if (event.type === 'bid.awarded') {
    console.log(\`  Winner: \${event.data.winnerId}\`);
  }
});

// Subscribe to proposal events (투찰 알림)
const unsubProposals = client.realtime.subscribeProposals((event) => {
  console.log(\`Proposal \${event.data.proposalId}: \${event.type}\`);
});

// Subscribe to fleet EI changes
const unsubFleet = client.realtime.subscribeFleet((event) => {
  console.log(\`Fleet \${event.data.carrierId}: EI changed to \${event.data.eiCurrent}\`);
});

// Check SSE connection health
const health = await client.realtime.getHealth();
console.log(\`SSE status: \${health.status}\`);

// List available channels
const channels = await client.realtime.getChannels();
console.log(\`Available channels: \${channels.map(c => c.name).join(', ')}\`);

// Unsubscribe when done
unsubOrders();
unsubBid();
unsubProposals();
unsubFleet();

// === HTTP Polling (fallback for environments without SSE) ===

// Poll for latest order events
const orderEvents = await client.realtime.pollOrders({ limit: 10 });
for (const event of orderEvents.events) {
  console.log(\`[\${event.timestamp}] \${event.type}: \${event.data.orderId}\`);
}

// Poll for latest bid events
const bidEvents = await client.realtime.pollBids({ limit: 10 });
console.log(\`Bid events: \${bidEvents.events.length}\`);`,
  },
  {
    id: 'esg',
    title: 'ESG Reporting: Record & Verify',
    description: 'Create carbon records, sign with Ed25519, detect anomalies, and export ESG reports.',
    icon: <BarChart3 className="w-5 h-5" />,
    code: `import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',
  apiKey: 'glk_live_xxxxxxxxxxxx',
});

// Step 1: Generate signing key pair (one-time)
const keyPair = await client.integrity.generateKeyPair();
console.log(\`Public Key: \${keyPair.publicKeyHex}\`);
// Store your private key securely!

// Step 2: Record carbon emissions after delivery
const record = await client.integrity.createCarbonRecord({
  orderId: 'order-uuid',
  fleetId: 'fleet-uuid',
  distanceKm: 405,
  cargoWeightTonnes: 10.5,
  fuelConsumedLiters: 145,
  fuelType: 'Diesel',
  grade: 1,                  // Grade 1 = Primary telematics data
  source: 'TELEMATICS',
  sourceSystem: 'TMap Fleet',
  sourceTimestamp: new Date().toISOString(),
});

// Step 3: Digitally sign the record (Ed25519)
const signed = await client.integrity.signRecord(record.id);
console.log(\`Signed: \${signed.signature ? 'Yes' : 'No'}\`);

// Step 4: Verify record integrity
const verification = await client.integrity.verifyRecord(record.id);
console.log(\`Hash valid: \${verification.hashValid}\`);
console.log(\`Signature valid: \${verification.signatureValid}\`);
console.log(\`Chain valid: \${verification.chainValid}\`);

// Step 5: Run anomaly detection
const anomaly = await client.integrity.detectAnomalies(record.id);
if (anomaly.isAnomalous) {
  console.warn('Anomaly detected:', anomaly.alerts);
} else {
  console.log(\`Clean record (score: \${anomaly.anomalyScore})\`);
}

// Step 6: Export ISO-14083 ESG summary
const summary = await client.integrity.exportSummary({
  startDate: '2026-01-01',
  endDate: '2026-12-31',
});
console.log(\`Annual emissions: \${summary.totalEmissionsKgCO2e} kg CO\u2082e\`);
console.log(\`Weighted avg EI: \${summary.weightedAverageEI} gCO\u2082e/t\u00b7km\`);
console.log(\`Data quality: \${summary.dataQualityScore}/100\`);`,
  },
  {
    id: 'integrity-batch',
    title: 'Batch Operations & Chain Verification',
    description: 'Batch create records, batch verify, and validate the entire hash chain for a carrier.',
    icon: <Shield className="w-5 h-5" />,
    code: `import { GlecClient } from '@glec/sdk';

const client = new GlecClient({
  baseUrl: 'https://api.glec.kr',
  apiKey: 'glk_live_xxxxxxxxxxxx',
});

// Batch create carbon records (up to 100 at once)
const batchResult = await client.integrity.batchCreateCarbonRecords([
  {
    orderId: 'order-1', fleetId: 'fleet-1',
    distanceKm: 200, cargoWeightTonnes: 8,
    fuelConsumedLiters: 70, fuelType: 'Diesel',
    grade: 1, source: 'TELEMATICS',
  },
  {
    orderId: 'order-2', fleetId: 'fleet-1',
    distanceKm: 350, cargoWeightTonnes: 12,
    fuelConsumedLiters: 130, fuelType: 'Diesel',
    grade: 2, source: 'FUEL_LOG',
  },
  // ... up to 100 records
]);
console.log(\`Created: \${batchResult.created} records\`);

// Batch verify multiple records
const verifyResult = await client.integrity.batchVerify(
  batchResult.recordIds  // Up to 200 IDs
);
console.log(\`All valid: \${verifyResult.allValid}\`);

// Verify entire carrier hash chain
const chainResult = await client.integrity.verifyChain('carrier-uuid');
console.log(\`Chain length: \${chainResult.totalRecords}\`);
console.log(\`Chain valid: \${chainResult.chainValid}\`);
if (chainResult.brokenLinks.length > 0) {
  console.warn('Broken links:', chainResult.brokenLinks);
}

// Batch anomaly detection
const anomalyResult = await client.integrity.batchAnomalyCheck(
  batchResult.recordIds  // Up to 100 IDs
);
const anomalous = anomalyResult.results.filter(r => r.isAnomalous);
console.log(\`Anomalies found: \${anomalous.length}/\${anomalyResult.results.length}\`);`,
  },
];

export function CodeExamplesTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedExample, setExpandedExample] = useState<string>('shipper');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-slate-600">
        Complete workflow recipes organized by use case. Each example shows a full end-to-end flow using the TypeScript SDK.
      </p>

      {EXAMPLES.map((example) => {
        const isExpanded = expandedExample === example.id;
        return (
          <div key={example.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpandedExample(isExpanded ? '' : example.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                {example.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{example.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{example.description}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
              <div className="px-5 pb-5">
                <CodeBlock
                  code={example.code}
                  id={`example-${example.id}`}
                  language="TypeScript"
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* ISO-14083 Grade Reference */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">ISO-14083 EI Grade Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">GRADE 1</span>
            </div>
            <p className="text-sm font-medium text-slate-900">Primary Data</p>
            <p className="text-xs text-slate-500 mt-1">Telematics, GPS, fuel sensors. 95%+ confidence.</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">GRADE 2</span>
            </div>
            <p className="text-sm font-medium text-slate-900">Secondary Data</p>
            <p className="text-xs text-slate-500 mt-1">Fuel cards, logs, modeled estimates. 80-95% confidence.</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-bold">GRADE 3</span>
            </div>
            <p className="text-sm font-medium text-slate-900">Default Values</p>
            <p className="text-xs text-slate-500 mt-1">Industry averages, GLEC defaults. 70% confidence.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

