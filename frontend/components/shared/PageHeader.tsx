import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
}

export const PageHeader = ({ title, subtitle, badge, children }: PageHeaderProps) => {
  return (
    <section className="bg-white border-b border-[#e2e8f0] px-8 py-16">
      <div className="max-w-[1200px] mx-auto text-left">
        {badge && (
          <span className="inline-block px-4 py-1.5 bg-[#f0fdf4] text-[#06C755] text-sm font-semibold rounded-full mb-4 border border-[#06C755]/20">
            {badge}
          </span>
        )}
        <h1 className="text-[32px] md:text-[42px] font-bold text-[#1e293b] mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[18px] text-[#475569] max-w-[600px]">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
};