import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import { StaffRoute, StudentRoute } from './components/common'

import Home from './pages/Home'
import About from './pages/About'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import Feedback from './pages/Feedback'
import Login from './pages/Login'
import Register from './pages/Register'
import CanteenLogin from './pages/CanteenLogin'
import CanteenMenu from './pages/CanteenMenu'
import CanteenOrders from './pages/CanteenOrders'

/*
 * Route map (old file -> new path)
 *   home.html          /
 *   about.html         /about
 *   menu.html          /menu
 *   cart.html          /cart            (student only)
 *   checkout.html      /checkout        (student only)
 *   orders.html        /orders          (student only)
 *   profile.html       /profile         (student only)
 *   contact.html       /feedback        (renamed "give feedback"; /contact redirects)
 *   login.html         /login
 *   register.html      /register
 *   canteenlogin.html  /canteen/login
 *   canteenmenu.html   /canteen/menu    (staff only)
 *   canteenorders.html /canteen/orders  (staff only)
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/contact" element={<Navigate to="/feedback" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/cart" element={<StudentRoute><Cart /></StudentRoute>} />
            <Route path="/checkout" element={<StudentRoute><Checkout /></StudentRoute>} />
            <Route path="/orders" element={<StudentRoute><Orders /></StudentRoute>} />
            <Route path="/profile" element={<StudentRoute><Profile /></StudentRoute>} />

            <Route path="/canteen/login" element={<CanteenLogin />} />
            <Route path="/canteen/menu" element={<StaffRoute><CanteenMenu /></StaffRoute>} />
            <Route path="/canteen/orders" element={<StaffRoute><CanteenOrders /></StaffRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}
