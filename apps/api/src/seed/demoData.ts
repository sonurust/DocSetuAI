import type { Customer, Invoice, CustomerSegment } from '@docsetuai/types';
import { taskStore } from '../store/taskStore';
import { customerStore } from '../store/customerStore';
import { firestoreRepo } from '../store/firestore.repository';

// ── Customer seed data ────────────────────────────────────────────────────────

const COMPANIES = [
  'Acme Industries', 'Bharat Tech Solutions', 'Sunrise Exports', 'Metro Infra',
  'Global Ventures', 'Apex Consultants', 'Krishna Enterprises', 'Sigma Analytics',
  'Pioneer Systems', 'Zenith Corp', 'Nuvama Capital', 'Orbit Dynamics',
  'Radiant Services', 'BlueSky Logistics', 'Falcon Pharma', 'Indus Networks',
  'Prism Solutions', 'Horizon Builders', 'ClearPath Advisors', 'Vertex Technologies',
  'Maple Finance', 'Sterling Operations', 'TrueNorth Consulting', 'GreenWave Energy',
  'Helix Biotech', 'Synapse Systems', 'Lighthouse Retail', 'Cascade Media',
  'Quantum Dynamics', 'NovaCom', 'DataBridge', 'CloudFirst', 'FlowWorks',
  'PrimeCare Health', 'SmartGrid Electric', 'DeltaForce Security', 'Pinnacle Real Estate',
  'Axis Freight', 'CoreLogic', 'LinkBridge Telecom', 'FastTrack Delivery',
  'SkyVault Storage', 'Redwood Capital', 'IronClad Manufacturing', 'TrueData Analytics',
  'SwiftPay Fintech', 'CloudNest SaaS', 'NextGen Retail', 'BuildRight Construction',
  'FutureMed Diagnostics',
];

const SEGMENTS: CustomerSegment[] = ['enterprise', 'mid_market', 'smb', 'startup'];
const CHANNELS = ['email', 'phone', 'whatsapp'] as const;

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0] ?? '';
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0] ?? '';
}

export function buildSeedData(): { customers: Customer[]; invoices: Invoice[] } {
  const customers: Customer[] = COMPANIES.map((company, i) => {
    const id = `CUS-${String(1000 + i).padStart(4, '0')}`;
    const segment = SEGMENTS[i % SEGMENTS.length]!;
    const channel = CHANNELS[i % CHANNELS.length]!;
    return {
      id,
      name: `${['Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikas', 'Meera', 'Arjun', 'Kavya'][i % 8]} ${['Kumar', 'Sharma', 'Gupta', 'Patel', 'Singh', 'Mehta', 'Joshi', 'Nair'][i % 8]}`,
      email: `billing@${company.toLowerCase().replace(/\s+/g, '')}.in`,
      company,
      phone: `+91 ${randomBetween(70000, 99999)}${randomBetween(10000, 99999)}`,
      segment,
      risk_score: randomBetween(10, 90),
      created_at: new Date(Date.now() - randomBetween(30, 730) * 86400000).toISOString(),
      preferred_channel: channel,
      notes: i % 5 === 0 ? 'VIP customer — handle with care' : undefined,
    } satisfies Customer;
  });

  const invoices: Invoice[] = [];

  // 20 overdue invoices
  const overdueConfigs = [
    { days: 12, amount: 48500, custIdx: 0 }, { days: 7, amount: 23000, custIdx: 1 },
    { days: 18, amount: 135000, custIdx: 2 }, { days: 9, amount: 67800, custIdx: 3 },
    { days: 25, amount: 220000, custIdx: 4 }, { days: 8, amount: 15500, custIdx: 5 },
    { days: 31, amount: 89000, custIdx: 6 }, { days: 14, amount: 42000, custIdx: 7 },
    { days: 11, amount: 76500, custIdx: 8 }, { days: 7, amount: 31000, custIdx: 9 },
    { days: 22, amount: 185000, custIdx: 10 }, { days: 16, amount: 54000, custIdx: 11 },
    { days: 10, amount: 27500, custIdx: 12 }, { days: 8, amount: 98000, custIdx: 13 },
    { days: 13, amount: 44000, custIdx: 14 }, { days: 19, amount: 162000, custIdx: 15 },
    { days: 7, amount: 18000, custIdx: 16 }, { days: 28, amount: 73000, custIdx: 17 },
    { days: 9, amount: 36500, custIdx: 18 }, { days: 15, amount: 112000, custIdx: 19 },
  ];

  overdueConfigs.forEach(({ days, amount, custIdx }, i) => {
    const cust = customers[custIdx]!;
    invoices.push({
      id: `INV-${String(2000 + i).padStart(4, '0')}`,
      customer_id: cust.id,
      amount,
      currency: 'INR',
      invoice_date: daysAgo(days + 30),
      due_date: daysAgo(days),
      status: 'overdue',
      days_overdue: days,
      description: `Professional services — Q${Math.ceil((new Date().getMonth() + 1) / 3)} 2026`,
    });
  });

  // 55 paid / current invoices
  for (let i = 0; i < 55; i++) {
    const custIdx = (i + 20) % customers.length;
    const isPaid = i < 30;
    const cust = customers[custIdx]!;
    invoices.push({
      id: `INV-${String(3000 + i).padStart(4, '0')}`,
      customer_id: cust.id,
      amount: randomBetween(10000, 250000),
      currency: 'INR',
      invoice_date: daysAgo(randomBetween(5, 45)),
      due_date: isPaid ? daysAgo(randomBetween(1, 20)) : daysFromNow(randomBetween(7, 30)),
      status: isPaid ? 'paid' : 'sent',
      days_overdue: 0,
      description: `Services invoice — ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
    });
  }

  return { customers, invoices };
}

export async function seedDemoData(): Promise<void> {
  const { customers, invoices } = buildSeedData();
  customerStore.seed(customers, invoices);
  console.log(`[Seed] ${customers.length} customers, ${invoices.length} invoices loaded`);
  console.log(`[Seed] ${invoices.filter((i) => i.status === 'overdue').length} overdue invoices`);
  firestoreRepo.seedData(customers, invoices).catch(() => {});
}
