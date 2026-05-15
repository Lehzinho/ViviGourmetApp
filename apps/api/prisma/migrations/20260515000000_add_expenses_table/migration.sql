-- Remove old expense enums (unused)
DROP TYPE IF EXISTS "ExpenseType";
DROP TYPE IF EXISTS "ExpensePeriod";

-- Recreate expenses table with new schema
DROP TABLE IF EXISTS "Expense";

CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "recurrence" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expenses_companyId_idx" ON "expenses"("companyId");
CREATE INDEX "expenses_companyId_deletedAt_idx" ON "expenses"("companyId", "deletedAt");
CREATE INDEX "expenses_companyId_date_idx" ON "expenses"("companyId", "date");
CREATE INDEX "expenses_companyId_category_idx" ON "expenses"("companyId", "category");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
