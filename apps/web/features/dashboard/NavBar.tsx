import Link from 'next/link';

const links = [
  { href: '/', label: '대시보드' },
  { href: '/sites', label: '현장' },
  { href: '/equipment', label: '설비' },
  { href: '/work-orders', label: '작업' },
  { href: '/templates', label: '템플릿' },
  { href: '/reports', label: '보고서' },
];

export function NavBar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <span className="text-lg font-bold text-brand">WorkReport AI</span>
        <nav className="flex gap-4 text-sm text-gray-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
