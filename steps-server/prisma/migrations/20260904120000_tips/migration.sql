-- The academy's monthly parenting tips, and which parent has read which.
--
-- Translations follow the Course pattern: the base column is required and is
-- the fallback for any locale with no translation of its own, so a tip is
-- publishable as soon as it exists in one language.

CREATE TABLE "Tip" (
  "id"          TEXT NOT NULL,
  "emoji"       TEXT NOT NULL DEFAULT '💡',
  "title"       TEXT NOT NULL,
  "titleAr"     TEXT,
  "titleHe"     TEXT,
  "excerpt"     TEXT,
  "excerptAr"   TEXT,
  "excerptHe"   TEXT,
  "body"        TEXT NOT NULL,
  "bodyAr"      TEXT,
  "bodyHe"      TEXT,
  "month"       INTEGER NOT NULL,
  "year"        INTEGER NOT NULL,
  "minutes"     INTEGER NOT NULL DEFAULT 3,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdBy"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- Parents only ever list published tips, newest month first.
CREATE INDEX "Tip_isPublished_year_month_idx" ON "Tip"("isPublished", "year", "month");

ALTER TABLE "Tip" ADD CONSTRAINT "Tip_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TipRead" (
  "tipId"  TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipRead_pkey" PRIMARY KEY ("tipId","userId")
);

CREATE INDEX "TipRead_userId_idx" ON "TipRead"("userId");

-- Both sides cascade: deleting a tip or an account takes its read marks with
-- it, and neither is worth keeping on its own.
ALTER TABLE "TipRead" ADD CONSTRAINT "TipRead_tipId_fkey"
  FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TipRead" ADD CONSTRAINT "TipRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
