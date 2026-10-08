import { prisma } from '../lib/prisma.ts';
import { validEmail } from '../lib/auth-http.ts';
import { issueResetToken, resetSecret } from '../lib/password-reset.ts';

// Operator-only command. Verify account ownership through the support process first.
async function main() {
  const [email, confirmation] = process.argv.slice(2);
  if (!validEmail(email) || confirmation !== '--identity-verified') {
    throw new Error('Usage: npm run auth:reset-token -- user@example.com --identity-verified');
  }
  const secret = resetSecret();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('No account found for that email');
  console.log('Deliver this one-use token privately to the verified owner. It expires in 15 minutes:');
  console.log(issueResetToken(user, secret));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Unable to issue reset token');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
