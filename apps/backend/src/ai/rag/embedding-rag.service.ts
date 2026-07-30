import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SimilaritySearchResult {
    id: string;
    documentType: string;
    referenceId: string;
    content: string;
    similarityScore: number;
    metadata: any;
}

@Injectable()
export class EmbeddingRagService {
    private readonly logger = new Logger(EmbeddingRagService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Deterministically generates a 128-dimensional embedding vector from text content.
     */
    public generateEmbedding(text: string): number[] {
        const dimensions = 128;
        const embedding = new Array(dimensions).fill(0);
        const cleanText = text.toLowerCase().trim();

        for (let i = 0; i < cleanText.length; i++) {
            const charCode = cleanText.charCodeAt(i);
            const index = (charCode * (i + 1)) % dimensions;
            embedding[index] += (charCode / 255.0);
        }

        // Normalize vector (L2 norm)
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
        return embedding.map(val => Number((val / magnitude).toFixed(6)));
    }

    /**
     * Stores a document vector embedding with strict multi-tenant organizationId scope.
     */
    async storeEmbedding(params: {
        organizationId: string;
        documentType: 'TRANSACTION' | 'INVOICE' | 'SUMMARY' | 'OCR_DOCUMENT';
        referenceId: string;
        content: string;
        metadata?: Record<string, any>;
    }) {
        const { organizationId, documentType, referenceId, content, metadata = {} } = params;
        const embeddingVector = this.generateEmbedding(content);

        this.logger.log(`Storing vector embedding for Org ${organizationId} [Type: ${documentType}, Ref: ${referenceId}]`);

        return await this.prisma.financialEmbedding.create({
            data: {
                organizationId,
                documentType,
                referenceId,
                content,
                embedding: embeddingVector,
                metadata,
            },
        });
    }

    /**
     * Performs vector similarity search with strict multi-tenant organizationId filtering.
     */
    async searchSimilarity(params: {
        organizationId: string;
        query: string;
        documentType?: string;
        limit?: number;
    }): Promise<SimilaritySearchResult[]> {
        const { organizationId, query, documentType, limit = 5 } = params;
        const queryVector = this.generateEmbedding(query);

        // Retrieve tenant embeddings
        const records = await this.prisma.financialEmbedding.findMany({
            where: {
                organizationId, // Strict multi-tenant isolation
                ...(documentType ? { documentType } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Compute Cosine Similarity
        const results: SimilaritySearchResult[] = records.map(record => {
            const score = this.cosineSimilarity(queryVector, record.embedding);
            return {
                id: record.id,
                documentType: record.documentType,
                referenceId: record.referenceId,
                content: record.content,
                similarityScore: Number(score.toFixed(4)),
                metadata: record.metadata,
            };
        });

        // Sort descending by similarity score
        results.sort((a, b) => b.similarityScore - a.similarityScore);
        return results.slice(0, Math.min(limit, 10));
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length || vecA.length === 0) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dotProduct / denom;
    }
}
