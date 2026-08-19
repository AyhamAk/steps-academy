import { prisma } from "./src/lib/prisma";
async function main() {
  const polls = await prisma.$queryRawUnsafe<any[]>(
    `select e."createdAt", u.email from "AnalyticsEvent" e left join "User" u on u.id = e."userId"
     where e.name='api_request' and e.props->>'route' = '/api/notifications'
     order by e."createdAt" desc limit 4`);
  console.log("notification polls (new build only):", polls.length);
  for (const p of polls) console.log(`  ${new Date(p.createdAt).toISOString().slice(11,19)} ${p.email ?? "(anon)"}`);
  const tok = await prisma.user.findMany({
    where: { email: { in: ["sarah@steps.local", "admin@steps.local"] } },
    select: { email: true, pushToken: true } });
  console.log("\npush tokens:");
  for (const u of tok) console.log(`  ${u.email.padEnd(22)} ${u.pushToken ? "REGISTERED" : "none"}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); }).then(() => process.exit(0));
