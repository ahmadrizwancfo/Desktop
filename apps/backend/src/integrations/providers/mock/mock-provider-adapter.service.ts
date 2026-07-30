import { Injectable, Logger } from '@nestjs/common';
import { BaseProviderAdapter } from '../../interfaces/base-provider-adapter.interface';
import { ProviderCapabilities, SyncOptions, SyncResult } from '../../interfaces/provider-capabilities.interface';
import { CanonicalAccount } from '../../domain/canonical-account.schema';
import { CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { CanonicalInvoice } from '../../domain/canonical-invoice.schema';
import { CanonicalTaxEvent } from '../../domain/canonical-tax-event.schema';
import crypto from 'crypto';

@Injectable()
export class MockProviderAdapter implements BaseProviderAdapter {
  readonly providerName = 'MOCK_PROVIDER';
  readonly providerVersion = '1.0.0';
  private readonly logger = new Logger(MockProviderAdapter.name);

  getCapabilities(): ProviderCapabilities {
    return {
      providerName: this.providerName,
      providerVersion: this.providerVersion,
      capabilities: ['BANKING', 'INVOICING', 'TAXATION', 'PAYMENTS', 'TESTING'],
      supportedObjects: ['ACCOUNT', 'TRANSACTION', 'INVOICE', 'TAX_EVENT'],
      supportsInitialSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: false,
      healthStatus: 'HEALTHY',
      registrationTimestamp: new Date(),
    };
  }

  async connect(organizationId: string, _credentials: Record<string, any>): Promise<boolean> {
    this.logger.log(`[MockProviderAdapter] Connected mock provider for Org ${organizationId}`);
    return true;
  }

  async disconnect(organizationId: string): Promise<boolean> {
    this.logger.log(`[MockProviderAdapter] Disconnected mock provider for Org ${organizationId}`);
    return true;
  }

  async testConnection(_organizationId: string): Promise<{ active: boolean; latencyMs: number }> {
    return { active: true, latencyMs: 5 };
  }

  async pullAccounts(organizationId: string, _options?: SyncOptions): Promise<CanonicalAccount[]> {
    const now = new Date();
    return [
      {
        schemaVersion: '1.0',
        internalAccountId: crypto.randomUUID(),
        organizationId,
        sourceProvider: this.providerName,
        externalAccountId: 'MOCK_ACC_001',
        accountName: 'HDFC Primary Corporate Operating Account',
        accountType: 'CURRENT',
        currency: 'INR',
        currentBalance: 4500000.00,
        availableBalance: 4500000.00,
        accountNumberMasked: 'XXXX-XXXX-4921',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        status: 'ACTIVE',
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        schemaVersion: '1.0',
        internalAccountId: crypto.randomUUID(),
        organizationId,
        sourceProvider: this.providerName,
        externalAccountId: 'MOCK_ACC_002',
        accountName: 'ICICI Reserve Treasury Account',
        accountType: 'SAVINGS',
        currency: 'INR',
        currentBalance: 12000000.00,
        availableBalance: 12000000.00,
        accountNumberMasked: 'XXXX-XXXX-8812',
        ifscCode: 'ICIC0005678',
        bankName: 'ICICI Bank',
        status: 'ACTIVE',
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        schemaVersion: '1.0',
        internalAccountId: crypto.randomUUID(),
        organizationId,
        sourceProvider: this.providerName,
        externalAccountId: 'MOCK_ACC_003',
        accountName: 'Razorpay Gateway Settlement Account',
        accountType: 'PAYMENT_GATEWAY',
        currency: 'INR',
        currentBalance: 350000.00,
        availableBalance: 350000.00,
        accountNumberMasked: 'RZP-SETTLE-001',
        bankName: 'Razorpay',
        status: 'ACTIVE',
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async pullTransactions(organizationId: string, _options?: SyncOptions): Promise<CanonicalTransaction[]> {
    const now = new Date();
    const mockBankAccountId = crypto.randomUUID();

    const rawTxs = [
      { extId: 'MOCK_TX_001', amount: 150000, dir: 'INFLOW' as const, type: 'CREDIT' as const, party: 'Acme Corp India', cat: 'REVENUE' },
      { extId: 'MOCK_TX_002', amount: 45000, dir: 'OUTFLOW' as const, type: 'DEBIT' as const, party: 'AWS Cloud Services', cat: 'INFRASTRUCTURE' },
      { extId: 'MOCK_TX_003', amount: 280000, dir: 'OUTFLOW' as const, type: 'DEBIT' as const, party: 'Payroll Disbursal July', cat: 'SALARIES' },
      { extId: 'MOCK_TX_004', amount: 12000, dir: 'OUTFLOW' as const, type: 'DEBIT' as const, party: 'Google Workspace', cat: 'SOFTWARE_SUBSCRIPTIONS' },
      { extId: 'MOCK_TX_005', amount: 75000, dir: 'INFLOW' as const, type: 'CREDIT' as const, party: 'Beta Client Retainer', cat: 'REVENUE' },
      { extId: 'MOCK_TX_006', amount: 18000, dir: 'OUTFLOW' as const, type: 'DEBIT' as const, party: 'WeWork Office Space', cat: 'RENT' },
      { extId: 'MOCK_TX_007', amount: 35000, dir: 'OUTFLOW' as const, type: 'TAX_REMITTANCE' as const, party: 'GST Return July 2026', cat: 'TAX' },
      { extId: 'MOCK_TX_008', amount: 2200, dir: 'OUTFLOW' as const, type: 'FEE' as const, party: 'Razorpay Gateway Fee', cat: 'BANK_FEES' },
      { extId: 'MOCK_TX_009', amount: 500000, dir: 'INFLOW' as const, type: 'CREDIT' as const, party: 'Sequoia Angel Tranche', cat: 'INVESTMENT' },
      { extId: 'MOCK_TX_010', amount: 15000, dir: 'OUTFLOW' as const, type: 'DEBIT' as const, party: 'Legal & Secretarial Retainer', cat: 'PROFESSIONAL_FEES' },
    ];

    return rawTxs.map((t, idx) => {
      const txDate = new Date(now.getTime() - idx * 86400000); // 1 day apart
      const idempotencyHash = crypto.createHash('sha256').update(`${organizationId}:${this.providerName}:${t.extId}:${t.amount}`).digest('hex');

      return {
        schemaVersion: '1.0',
        internalTransactionId: crypto.randomUUID(),
        externalTransactionId: t.extId,
        idempotencyHash,
        organizationId,
        bankAccountId: mockBankAccountId,
        sourceProvider: this.providerName,
        amount: t.amount,
        currency: 'INR',
        direction: t.dir,
        transactionType: t.type,
        transactionDate: txDate,
        settlementDate: txDate,
        importTimestamp: now,
        counterpartyName: t.party,
        category: t.cat,
        tags: ['MOCK', 'PHASE_6A'],
        confidenceScore: 1.0,
        reconciliationStatus: 'UNMATCHED',
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  async pullInvoices(organizationId: string, _options?: SyncOptions): Promise<CanonicalInvoice[]> {
    const now = new Date();
    return [
      {
        schemaVersion: '1.0',
        internalInvoiceId: crypto.randomUUID(),
        externalInvoiceId: 'MOCK_INV_101',
        organizationId,
        sourceProvider: this.providerName,
        invoiceNumber: 'INV-2026-001',
        customerName: 'Acme Corp India Pvt Ltd',
        customerEmail: 'billing@acme.in',
        customerGstin: '27AAAAA0000A1Z5',
        issueDate: new Date(now.getTime() - 15 * 86400000),
        dueDate: new Date(now.getTime() + 15 * 86400000),
        subTotalAmount: 127118.64,
        taxAmount: 22881.36,
        totalAmount: 150000.00,
        paidAmount: 0,
        outstandingAmount: 150000.00,
        currency: 'INR',
        status: 'SENT',
        lineItems: [
          {
            description: 'FounderCFO Enterprise AI License (Q3)',
            quantity: 1,
            unitPrice: 127118.64,
            taxRatePercent: 18,
            taxAmount: 22881.36,
            hsnSacCode: '998313',
            totalAmount: 150000.00,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        schemaVersion: '1.0',
        internalInvoiceId: crypto.randomUUID(),
        externalInvoiceId: 'MOCK_INV_102',
        organizationId,
        sourceProvider: this.providerName,
        invoiceNumber: 'INV-2026-002',
        customerName: 'Beta Retainer Client',
        customerEmail: 'finance@betaclient.io',
        customerGstin: '29BBBBP1111B1Z2',
        issueDate: new Date(now.getTime() - 30 * 86400000),
        dueDate: new Date(now.getTime() - 5 * 86400000),
        subTotalAmount: 63559.32,
        taxAmount: 11440.68,
        totalAmount: 75000.00,
        paidAmount: 75000.00,
        outstandingAmount: 0,
        currency: 'INR',
        status: 'PAID',
        lineItems: [
          {
            description: 'Financial Engineering Retainer',
            quantity: 1,
            unitPrice: 63559.32,
            taxRatePercent: 18,
            taxAmount: 11440.68,
            hsnSacCode: '998314',
            totalAmount: 75000.00,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async pullTaxEvents(organizationId: string, _options?: SyncOptions): Promise<CanonicalTaxEvent[]> {
    const now = new Date();
    return [
      {
        schemaVersion: '1.0',
        internalTaxEventId: crypto.randomUUID(),
        organizationId,
        sourceProvider: this.providerName,
        taxType: 'GST_OUTPUT',
        fiscalYear: 'FY2026-27',
        quarter: 'Q2',
        assessmentPeriod: '2026-07',
        grossAmount: 225000.00,
        taxAmount: 34322.04,
        penaltyAmount: 0,
        interestAmount: 0,
        currency: 'INR',
        dueDate: new Date(now.getTime() + 10 * 86400000),
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async sync(organizationId: string, options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const accounts = await this.pullAccounts(organizationId, options);
    const txs = await this.pullTransactions(organizationId, options);
    const invoices = await this.pullInvoices(organizationId, options);

    return {
      success: true,
      providerName: this.providerName,
      organizationId,
      accountsProcessed: accounts.length,
      transactionsImported: txs.length,
      invoicesImported: invoices.length,
      recordsSkipped: 0,
      recordsQuarantined: 0,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
