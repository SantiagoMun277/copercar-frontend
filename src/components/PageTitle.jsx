export default function PageTitle({ children, upper = false }) {
  return <div className={`page-title ${upper ? 'uppercase' : ''}`}>{children}</div>
}
