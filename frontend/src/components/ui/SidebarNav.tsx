interface SidebarItemProps {
  icon?: string;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick,
}: SidebarItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[12.5px] transition-all border ${
        active
          ? 'bg-accent-d text-accent border-[rgba(0,217,163,0.2)]'
          : 'text-text2 border-transparent hover:bg-bg2 hover:text-text'
      }`}
    >
      {icon && (
        <span className="text-[14px] w-[18px] text-center opacity-80">
          {icon}
        </span>
      )}
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-text3">{count}</span>
      )}
    </div>
  );
}

interface SidebarSectionProps {
  label: string;
  children: React.ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div className="px-3 pb-2">
      <div className="text-[10px] font-semibold text-text3 uppercase tracking-[1.2px] px-1 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
