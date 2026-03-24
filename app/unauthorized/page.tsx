export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h1 style={{ color: 'var(--text)', marginBottom: '8px' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-dimmer)', fontSize: '13px' }}>You need superadmin or matrix_admin access.</p>
      </div>
    </div>
  )
}