import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma';
import { DatabaseService } from '@app/database';

/**
 * Shared food search & ranking service.
 *
 * Uses PostgreSQL `pg_trgm` `similarity()` for fuzzy matching
 * and deterministic tier-based ranking for exact/prefix/word-boundary hits.
 *
 * Call `rankFoodIds()` to re-rank a set of candidate Food IDs,
 * or `searchFoods()` for a full ILIKE pre-filter + trgm re-rank pipeline.
 */
@Injectable()
export class FoodSearchService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * SQL-level ranking of candidate food IDs using pg_trgm + tiered scoring.
   *
   * Ranking tiers (lower = better):
   *   0 — exact name match
   *   1 — name starts with query
   *   2 — word-boundary match in name  (\\m = PG word boundary)
   *   3 — name substring
   *   4 — exact brand match
   *   5 — brand starts with query
   *   6 — brand substring
   *   7-8 — pg_trgm similarity on name/brand (> 0.1)
   *   9 — fallback
   *
   * Verified foods get a -0.5 boost.
   */
  async rankFoodIds(
    query: string,
    candidateIds: string[],
    limit: number,
  ): Promise<string[]> {
    if (candidateIds.length === 0 || !query)
      return candidateIds.slice(0, limit);

    const ranked = await this.db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT f."id",
        CASE
          WHEN LOWER(f."name") = LOWER(${query}) THEN 0
          WHEN LOWER(f."name") LIKE LOWER(${query}) || '%' THEN 1
          WHEN LOWER(f."name") ~ ('\m' || LOWER(${query})) THEN 2
          WHEN LOWER(f."name") LIKE '%' || LOWER(${query}) || '%' THEN 3
          WHEN LOWER(f."brand") = LOWER(${query}) THEN 4
          WHEN LOWER(f."brand") LIKE LOWER(${query}) || '%' THEN 5
          WHEN LOWER(f."brand") LIKE '%' || LOWER(${query}) || '%' THEN 6
          WHEN similarity(f."name", ${query}) > 0.1
            THEN 7.0 - similarity(f."name", ${query})
          WHEN similarity(f."brand", ${query}) > 0.1
            THEN 8.0 - similarity(f."brand", ${query})
          ELSE 9
        END
        - CASE WHEN f."isVerified" THEN 0.5 ELSE 0 END
        AS rank
      FROM "Food" f
      WHERE f."id" = ANY(${candidateIds})
      ORDER BY rank ASC, f."name" ASC
      LIMIT ${limit}
    `);

    return ranked.map((r) => r.id);
  }

  /**
   * Full pipeline: ILIKE pre-filter → pg_trgm re-rank.
   *
   * Returns ranked Food IDs. The caller fetches full records with Prisma selects.
   */
  async searchFoodIds(
    query: string,
    opts: {
      userId?: string;
      limit?: number;
      skip?: number;
      source?: string;
      brand?: string;
    } = {},
  ): Promise<{ ids: string[]; total: number }> {
    const limit = opts.limit ?? 20;
    const skip = opts.skip ?? 0;
    const overfetch = Math.max(limit * 3, 60);

    // Build Prisma where clause
    const where: Record<string, unknown> = { isActive: true };

    if (opts.userId) {
      where.OR = [
        { isPrivate: false },
        { isPrivate: true, createdById: opts.userId },
      ];
    } else {
      where.isPrivate = false;
    }

    if (query) {
      where.AND = [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (opts.brand) {
      where.brand = { contains: opts.brand, mode: 'insensitive' };
    }
    if (opts.source) {
      where.source = opts.source;
    }

    const [candidates, total] = await Promise.all([
      this.db.food.findMany({
        where,
        select: { id: true },
        take: query ? overfetch : limit,
        skip: query ? 0 : skip,
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      }),
      this.db.food.count({ where }),
    ]);

    if (!query) {
      return { ids: candidates.map((c) => c.id), total };
    }

    // Re-rank with pg_trgm at SQL level
    const rankedIds = await this.rankFoodIds(
      query,
      candidates.map((c) => c.id),
      overfetch,
    );

    // Paginate from the ranked list
    return { ids: rankedIds.slice(skip, skip + limit), total };
  }
}
