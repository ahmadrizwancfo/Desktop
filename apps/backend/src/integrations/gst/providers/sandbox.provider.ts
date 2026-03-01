import { Injectable, Logger } from '@nestjs/common';
import { IGSTProvider } from '../gst.interface';

@Injectable()
export class SandboxGSTProvider implements IGSTProvider {
    private readonly logger = new Logger(SandboxGSTProvider.name);

    async validateGSTIN(gstin: string): Promise<boolean> {
        this.logger.log(`[Sandbox] Validating GSTIN: ${gstin}`);
        // Simple regex check for sandbox: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit + Z + 1 digit/letter
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        // For sandbox, we'll accept our demo GSTIN or any valid format
        return gstin === '29ABCDE1234F1Z5' || gstRegex.test(gstin);
    }

    async fetchReturns(gstin: string, period: string): Promise<any> {
        this.logger.log(`[Sandbox] Fetching returns for ${gstin} period ${period}`);

        // Mock realistic delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (period === '2024-12') {
            return {
                gstin,
                period,
                gstr1: {
                    status: 'FILED',
                    totalInvoices: 142,
                    totalValue: 2450000,
                    filedDate: '2025-01-10'
                },
                gstr3b: {
                    status: 'NOT_FILED',
                    outwardTax: 124000,
                    inputTaxCredit: 42000,
                    netPayable: 82000,
                    dueDate: '2025-01-20'
                }
            };
        }

        // Default random data
        return {
            gstin,
            period,
            gstr1: { status: 'FILED', totalInvoices: Math.floor(Math.random() * 100), totalValue: Math.floor(Math.random() * 5000000), filedDate: '2025-01-11' },
            gstr3b: { status: 'FILED', outwardTax: 0, inputTaxCredit: 0, netPayable: 0, dueDate: '2025-01-20' }
        };
    }

    async fetchLiability(gstin: string, period: string): Promise<any> {
        this.logger.log(`[Sandbox] Fetching liability for ${gstin} period ${period}`);
        await new Promise(resolve => setTimeout(resolve, 600));

        if (gstin === '29ABCDE1234F1Z5') {
            return {
                gstin,
                period,
                liability: {
                    cgst: 41000,
                    sgst: 41000,
                    igst: 0,
                    cess: 0,
                    total: 82000
                },
                itcAvailable: {
                    cgst: 21000,
                    sgst: 21000,
                    igst: 0,
                    total: 42000
                },
                netPayable: 40000
            };
        }

        return { gstin, period, netPayable: 0 };
    }

    async fetchFilingStatus(gstin: string, period: string): Promise<any> {
        this.logger.log(`[Sandbox] Fetching filing status for ${gstin} period ${period}`);
        return {
            gstin,
            period,
            gstr1: 'FILED',
            gstr3b: 'PENDING',
            gstr2a: 'GENERATED'
        };
    }
}
