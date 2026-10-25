import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

// Same rules as the original canteenlogin.html
const ID_RE = /^[1-9][0-9]{9}$/
const PIN_RE = /^[0-9]{4}$/

export default function CanteenLogin() {
  const [eid, setEid] = useState('')
  const [pin, setPin] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    if (!eid) return alert('Employee ID is required.')
    if (!ID_RE.test(eid)) return alert('Employee ID should be exactly 10 digits and should not start with 0.')
    if (!pin) return alert('PIN is required.')
    if (!PIN_RE.test(pin)) return alert('PIN should be exactly 4 digits.')
    try {
      const out = await api.loginStaff({ emp_id: eid, pin })
      login(out)
      navigate('/canteen/orders')
    } catch (e2) {
      alert(e2.message)
    }
  }

  return (
    <section className="form-container">
      <form onSubmit={submit} id="logIn">
        <h3>canteen manager login</h3>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter your Employee ID"
          className="box"
          value={eid}
          onChange={(e) => setEid(e.target.value.replace(/\D/g, '').slice(0, 10))}
          required
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="Enter your PIN"
          className="box"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />
        <button type="submit" className="btn">Log In</button>
        <p>student? <Link to="/login">student login</Link></p>
      </form>
    </section>
  )
}
