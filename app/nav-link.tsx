"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 현재 페이지를 시각적으로 표시하는 네비 링크
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "relative py-1 transition-colors hover:text-cocoa " +
        (active ? "text-cocoa" : "text-cocoa/55")
      }
    >
      {children}
      <span
        className={
          "absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-berry transition-all duration-300 " +
          (active ? "w-full" : "w-0")
        }
      />
    </Link>
  );
}
