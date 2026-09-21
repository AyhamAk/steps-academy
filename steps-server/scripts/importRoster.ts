/**
 * Imports the academy's roster from the spreadsheet and issues one invite
 * code per child.
 *
 *   npx tsx scripts/importRoster.ts <file.xlsx>           # dry run
 *   npx tsx scripts/importRoster.ts <file.xlsx> --apply
 *
 * Parents are NOT created here, and cannot be: sign-up asks the parent for
 * their own email and password, and the spreadsheet has neither. The invite
 * code is what makes the account — redeeming one creates the login and links
 * it to the right child in a single step. So this script creates the
 * children, issues the codes, and writes the list of who to send which code
 * to.
 *
 * The child's national ID is deliberately left behind. There is no field for
 * it, nothing in the app reads it, and it is the most sensitive column in the
 * file.
 *
 * Re-running is safe: a child already on the roster is skipped by name, the
 * same case-insensitive rule the app's bulk import uses.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";

import { formatCode, InviteModel } from "../src/models/invite";
import { prisma } from "../src/lib/prisma";
import { StudentModel } from "../src/models/student";
import { UserModel } from "../src/models/user";

const ADMIN_EMAIL = "manager@steps-academy.com";
const MAX_USES = 2;
const EXPIRES_IN_DAYS = 30;
const OUTPUT = path.join(__dirname, "..", "roster-codes.csv");

/** The two side-by-side groups: name, id, mother, mother's phone, father's phone. */
const GROUPS = [
  { group: 1, columns: ["B", "C", "D", "E", "F"] },
  { group: 2, columns: ["J", "K", "L", "M", "N"] },
];

type Row = { group: number; name: string; mother: string; motherPhone: string; fatherPhone: string };

// --------------------------------------------------------------- xlsx reader

/**
 * Reads a .xlsx without a library.
 *
 * A workbook is a zip of XML, and this needs two members of it. Pulling in a
 * spreadsheet dependency for one import that runs once was not worth it.
 */
function readZipEntry(buffer: Buffer, wanted: string): string | null {
  // Walk the local file headers; the central directory is not needed for two
  // known names.
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;

    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLength);
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);

    if (name === wanted) {
      return method === 0 ? data.toString("utf8") : zlib.inflateRawSync(data).toString("utf8");
    }
    offset = dataStart + compressedSize;
  }
  return null;
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decode(t[1])).join(""),
  );
}

function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/** Cell reference (`B7`) to value, resolving shared strings. */
function parseSheet(xml: string, shared: string[]): Map<string, string> {
  const cells = new Map<string, string>();
  // An empty cell is written `<c r="A2"/>` with no closing tag. Matching only
  // the paired form makes one of those swallow every cell up to the next
  // `</c>`, which silently drops most of the sheet.
  for (const match of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, ref, attrs, inner] = match;
    const value = inner ? /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] : undefined;
    if (value === undefined) continue;
    const text = /t="s"/.test(attrs) ? (shared[Number(value)] ?? "") : value;
    const trimmed = decode(text).trim();
    if (trimmed) cells.set(ref, trimmed);
  }
  return cells;
}

/** Israeli mobiles are stored without their leading zero once Excel sees a number. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? digits : `0${digits}`;
}

function readRoster(file: string): Row[] {
  const buffer = fs.readFileSync(file);
  const shared = parseSharedStrings(readZipEntry(buffer, "xl/sharedStrings.xml"));
  const sheetXml = readZipEntry(buffer, "xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new Error("No sheet1 in that workbook.");

  const cells = parseSheet(sheetXml, shared);
  const rows: Row[] = [];

  for (const { group, columns } of GROUPS) {
    const [nameCol, , motherCol, motherPhoneCol, fatherPhoneCol] = columns;
    // Row 1 is the header; stop looking well past the longest group.
    for (let row = 2; row <= 60; row++) {
      const name = cells.get(`${nameCol}${row}`);
      if (!name) continue;
      rows.push({
        group,
        name,
        mother: cells.get(`${motherCol}${row}`) ?? "",
        motherPhone: normalisePhone(cells.get(`${motherPhoneCol}${row}`) ?? ""),
        fatherPhone: normalisePhone(cells.get(`${fatherPhoneCol}${row}`) ?? ""),
      });
    }
  }
  return rows;
}

// ------------------------------------------------------------------ the work

function notesFor(row: Row): string {
  const parts = [`קבוצה ${row.group}`];
  if (row.mother) parts.push(`أم: ${row.mother}`);
  if (row.fatherPhone) parts.push(`أب: ${row.fatherPhone}`);
  return parts.join(" · ");
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main(): Promise<void> {
  const file = process.argv.find((arg) => arg.endsWith(".xlsx"));
  if (!file) {
    console.error("Give me the spreadsheet: npx tsx scripts/importRoster.ts <file.xlsx> [--apply]");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");

  const rows = readRoster(file);
  const existing = await StudentModel.existingNames();
  const fresh = rows.filter((row) => !existing.has(row.name.toLowerCase()));
  const skipped = rows.length - fresh.length;
  const noPhone = rows.filter((row) => !row.motherPhone);

  console.log(`\n${rows.length} children in the spreadsheet — ${fresh.length} to create, ${skipped} already on the roster.`);
  if (noPhone.length) console.log(`${noPhone.length} with no phone number: ${noPhone.map((r) => r.name).join(", ")}`);

  for (const row of fresh) {
    console.log(`   g${row.group} ${row.name.padEnd(20)} ${row.motherPhone.padEnd(11)} ${notesFor(row)}`);
  }

  if (!apply) {
    console.log(`\nDry run — nothing was created. Re-run with --apply.\n`);
    return prisma.$disconnect();
  }

  if (fresh.length === 0) {
    console.log("\nNothing to do.\n");
    return prisma.$disconnect();
  }

  // Codes are attributed to a real admin, and deliberately not to
  // admin@steps.local — that account's password is published in devSeed.ts.
  const admin = await UserModel.findByEmail(ADMIN_EMAIL);
  if (!admin || admin.role !== "admin") {
    throw new Error(`No admin account ${ADMIN_EMAIL} to issue the codes from.`);
  }

  console.log("\nCreating…");
  const issued: (Row & { code: string })[] = [];

  for (const row of fresh) {
    const student = await StudentModel.create({
      name: row.name,
      guardianPhone: row.motherPhone || null,
      notes: notesFor(row),
    });
    const invite = await InviteModel.create({
      studentId: student.id,
      createdBy: admin.id,
      maxUses: MAX_USES,
      expiresInDays: EXPIRES_IN_DAYS,
    });
    issued.push({ ...row, code: formatCode(invite.code) });
  }

  const csv = [
    "child,group,mother,phone,code",
    ...issued.map((row) =>
      [row.name, `קבוצה ${row.group}`, row.mother, row.motherPhone, row.code].map(csvCell).join(","),
    ),
  ].join("\n");
  // BOM so Excel opens the Arabic and Hebrew correctly instead of mojibake.
  fs.writeFileSync(OUTPUT, `﻿${csv}\n`, "utf8");

  console.log(`\n${issued.length} children created, ${issued.length} codes issued (${MAX_USES} uses, ${EXPIRES_IN_DAYS} days).`);
  console.log(`Send-list written to ${OUTPUT}`);
  console.log("That file lists children against live access codes — it is gitignored, keep it off email.\n");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
