export default function SellPage() {
  return (
    <main style={{ background: '#fdf8e8', padding: '3rem 1rem', maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#0a1128', fontSize: '2rem' }}>Become a vendor</h1>
      <p style={{ color: '#334155', lineHeight: 1.6 }}>
        Vendor accounts are set up by the marketplace team. To provision your store, please reach out to our support team.
      </p>
      <a href="/contact-support" style={{ display: 'inline-block', marginTop: '1rem', padding: '.6rem 1.2rem', background: '#c5a047', color: '#fff', textDecoration: 'none', borderRadius: 6, fontWeight: 600 }}>
        Contact support
      </a>
    </main>
  );
}
