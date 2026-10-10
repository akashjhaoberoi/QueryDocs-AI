import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/security/auth-helper';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await requireAdmin();

  if (!isAdmin) {
    redirect('/');
  }

  return <>{children}</>;
}
