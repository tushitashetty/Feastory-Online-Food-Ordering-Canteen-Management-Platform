import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Same header as the original site: logo, navbar, cart/user/menu icons and
 * the drop-down profile card. Staff see the canteen menu/orders links and no
 * cart icon (as in canteenmenu.html / canteenorders.html).
 */
export default function Header() {
  const { user, isStaff, isStudent, logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Original script.js: close both popups on scroll / route change
  useEffect(() => {
    const onScroll = () => { setNavOpen(false); setProfileOpen(false) }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { setNavOpen(false); setProfileOpen(false) }, [location.pathname])

  const menuHref = isStaff ? '/canteen/menu' : '/menu'
  const ordersHref = isStaff ? '/canteen/orders' : '/orders'

  const handleLogout = () => {
    logout()
    navigate(isStaff ? '/canteen/login' : '/login')
  }

  return (
    <header className="header">
      <section className="flex">
        <Link to="/" className="logo">
          <img src="/images/wlogo.PNG" alt="Logo" width="200px" />
        </Link>

        <nav className={`navbar${navOpen ? ' active' : ''}`}>
          <Link to="/">home</Link>
          <Link to="/about">about</Link>
          <Link to={menuHref}>menu</Link>
          <Link to={ordersHref}>orders</Link>
          <Link to="/feedback">feedback</Link>
        </nav>

        <div className="icons">
          {!isStaff && (
            <Link to="/cart"><i className="fas fa-shopping-cart"></i></Link>
          )}
          <div
            id="user-btn"
            className="fas fa-user"
            onClick={() => { setProfileOpen((v) => !v); setNavOpen(false) }}
          ></div>
          <div
            id="menu-btn"
            className="fas fa-bars"
            onClick={() => { setNavOpen((v) => !v); setProfileOpen(false) }}
          ></div>
        </div>

        <div className={`profile${profileOpen ? ' active' : ''}`}>
          <p className="name" id="profileName">
            {user ? (isStaff ? `${user.name} (Emp ${user.emp_id})` : user.name) : 'not logged in'}
          </p>
          <div className="flex">
            {isStudent && (
              <button onClick={() => navigate('/profile')} className="btn">profile</button>
            )}
            {user ? (
              <button onClick={handleLogout} className="delete-btn">logout</button>
            ) : (
              <button onClick={() => navigate('/login')} className="btn">login</button>
            )}
          </div>
          <p className="account">
            <Link to="/login">Student</Link> or <Link to="/canteen/login">Canteen Manager</Link>
          </p>
        </div>
      </section>
    </header>
  )
}
