export default function Modal({ title, onClose, children, width = 600 }) {
  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{ maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
