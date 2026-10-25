import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

// Same rules as the original login.html
const SAPID_RE = /^[1-9][0-9]{10}$/
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$#!%*&])[A-Za-z\d@$#!%*&]{8,}$/

export default function Login() {
  const [sapid, setSapid] = useState('')
  const [pass, setPass] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()

  const validate = () => {
    if (sapid === '') return 'SAPID is required.'
    if (!SAPID_RE.test(sapid)) return 'SAPID should be exactly 11 digits and should not start with 0.'
    if (pass === '') return 'Password required.'
    if (!PASSWORD_RE.test(pass)) return 'Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.'
    return null
  }

  const submit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { alert(err); return }
    try {
      const out = await api.loginStudent({ sapid, password: pass })
      login(out)
      navigate(loc.state?.from || '/')
    } catch (e2) {
      alert(e2.message)
    }
  }

  return (
    <section className="form-container">
      <form onSubmit={submit} id="logIn">
        <h3>login now</h3>
        <input
          type="text"
          inputMode="numeric"
          placeholder="enter your SAP ID"
          className="box"
          value={sapid}
          onChange={(e) => setSapid(e.target.value.replace(/\D/g, '').slice(0, 11))}
        />
        <input
          type="password"
          placeholder="enter your password"
          className="box"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button type="submit" className="btn">Log In</button>
        <p>don't have an account? <Link to="/register">register now</Link></p>
        <p>canteen staff? <Link to="/canteen/login">manager login</Link></p>
      </form>
    </section>
  )
}
