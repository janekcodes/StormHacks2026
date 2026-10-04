export default function Loading() {
  return (
    <div className="status-page" role="status">
      <div className="status-card">
        <span className="loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <p>Opening the gallery</p>
      </div>
    </div>
  )
}
