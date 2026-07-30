import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from './canonical-model.interface';

@Injectable()
export class CategoryNormalizationService {
  private readonly logger = new Logger(CategoryNormalizationService.name);

  // Configurable Mapping Rules
  private readonly taxonomyMap: Array<{ pattern: RegExp; canonicalCategory: string }> = [
    { pattern: /AWS|AMAZON WEB|CLOUD|HOSTING|SERVER|GCP|DIGITALOCEAN/i, canonicalCategory: 'Cloud Infrastructure' },
    { pattern: /META|FACEBOOK|LINKEDIN|GOOGLE ADS|MARKETING|CAMPAIGN|ADVERTISING/i, canonicalCategory: 'Marketing' },
    { pattern: /SALARY|PAYROLL|STIPEND|CONTRACTOR PAY|BONUS|RETAINER/i, canonicalCategory: 'Payroll' },
    { pattern: /NOTION|SLACK|GITHUB|ZOOM|CANVA|HUBSPOT|SAAS/i, canonicalCategory: 'SaaS Subscriptions' },
    { pattern: /RENT|OFFICE|UTILITIES|INTERNET|ELECTRICITY/i, canonicalCategory: 'Office & Facilities' },
    { pattern: /LEGAL|AUDIT|ACCOUNTING|COMPLIANCE|TAX CONSULTANT/i, canonicalCategory: 'Professional Services' },
  ];

  /**
   * Normalizes a CanonicalTransaction before event emission
   */
  public normalizeTransaction(tx: CanonicalTransaction): CanonicalTransaction {
    const rawCategory = tx.category || tx.originalCategory || 'Unclassified Expense';
    const originalCategory = tx.originalCategory || rawCategory;
    const normalizedCategory = this.classifyCategory(originalCategory);

    return {
      ...tx,
      schemaVersion: tx.schemaVersion || '1.0',
      sourceSystem: tx.sourceSystem || tx.source,
      originalCategory,
      normalizedCategory,
      category: normalizedCategory, // Standardized category for downstream financial engines
    };
  }

  /**
   * Classification logic
   */
  public classifyCategory(categoryName: string): string {
    const cat = categoryName.trim();
    for (const rule of this.taxonomyMap) {
      if (rule.pattern.test(cat)) {
        return rule.canonicalCategory;
      }
    }
    return cat || 'General & Administrative';
  }
}
