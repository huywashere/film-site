export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="w-full animate-[route-in_150ms_ease-out]">{children}</div>;
}
