export default function GuestLayout({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(150deg, #dde8f5 0%, #eaf0fb 50%, #d8e6f3 100%)' }}
    >
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
