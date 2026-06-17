# Compliance documentation

Parent hub: [Documentation index](../README.md).

**Internal only:** these Markdown files live in the **private** Vara source repository. They are **not** a public webpage and are **not** visible to app users or website visitors unless you copy them elsewhere.

Use them for **engineering, privacy, and procurement** (due diligence packs, security reviews). **Customer-facing** sub-processor and residency disclosures should stay in the **in-app / seeded Privacy Policy** and on whatever **public** legal pages you operate, plus **privacy@varaperformance.com** for written requests.

| Document | Purpose |
|----------|---------|
| [sub-processors.md](./sub-processors.md) | Register of processors / sub-processors, typical data, regions, DPA or privacy links |
| [data-residency.md](./data-residency.md) | Where production-style workloads and vendor data flows live (fill per environment) |
| [record-of-processing-activities.md](./record-of-processing-activities.md) | **Draft** Art. 30 ROPA-style register + lawful basis sketch (legal review required) |

**Keeping seeds in sync:** `apps/backend/prisma/seeds/seed-legal-documents.ts` is the source of truth for Prisma-based seeding. `apps/backend/prisma/seeds/seed-legal-documents.sql` is used by `hack/seed-k8s.sh` on empty databases; when privacy copy changes, update both files (or regenerate SQL) so fresh clusters match.

**Apply Privacy Policy to databases that already have v1.0.0** (content + `hashValue` from the TS seed):

```bash
# Local (uses DATABASE_URL from apps/backend/.env)
node hack/compliance/update-privacy-legal.mjs --local

# Kubernetes production Postgres (default namespace: production)
node hack/compliance/update-privacy-legal.mjs --k8s

# Both
node hack/compliance/update-privacy-legal.mjs --local --k8s
```
