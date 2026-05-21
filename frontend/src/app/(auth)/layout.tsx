export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid-overlay" style={{ background: 'linear-gradient(135deg, #0a0a0c 0%, #131316 100%)' }}>
      {children}
    </div>
  );
}
