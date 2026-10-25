import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** The black breadcrumb band under the header ("our menu" / home / menu). */
export function Heading({ title, crumb }) {
  return (
    <div className="heading">
      <h3>{title}</h3>
      <p><Link to="/">home </Link> <span> / {crumb || title}</span></p>
    </div>
  )
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

/** Only students may pass. Others are sent to the student login. */
export function StudentRoute({ children }) {
  const { isStudent } = useAuth()
  const loc = useLocation()
  if (!isStudent) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

/** Only canteen managers may pass. */
export function StaffRoute({ children }) {
  const { isStaff } = useAuth()
  if (!isStaff) return <Navigate to="/canteen/login" replace />
  return children
}
