export default function ComingSoon({ title, desc }) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="coming-soon-card">
        <div className="coming-soon-icon">🔜</div>
        <h2 className="coming-soon-title">Em breve</h2>
        <p className="coming-soon-desc">{desc}</p>
      </div>
    </div>
  )
}
