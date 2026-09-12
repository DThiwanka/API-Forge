export default function CommandGroup({ heading, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return null;
  }

  return (
    <div className="py-1">
      <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
        {heading}
      </div>
      <div className="space-y-0.5 mt-0.5">
        {children}
      </div>
    </div>
  );
}

