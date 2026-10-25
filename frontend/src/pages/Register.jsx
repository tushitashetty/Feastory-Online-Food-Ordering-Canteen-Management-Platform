import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

// Same rules as the original register.html
const NAME_RE = /^[a-zA-Z\s]*$/
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|edu)$/
const SAPID_RE = /^[1-9][0-9]{10}$/
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$#!%*&])[A-Za-z\d@$#!%*&]{8,}$/

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', sapid: '', password: '' })
  const { login } = useAuth()
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    const { name, email, sapid, password } = form
    if (name === '') return 'Name is required.'
    if (!NAME_RE.test(name)) return 'Name must have only letters'
    if (email === '') return 'Email is required.'
    if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.'
    if (sapid === '') return 'SAPID is required.'
    if (!SAPID_RE.test(sapid)) return 'SAPID should be exactly 11 digits and should not start with 0.'
    if (password === '') return 'Password required.'
    if (!PASSWORD_RE.test(password)) return 'Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.'
    return null
  }

  const submit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { alert(err); return }
    try {
      const out = await api.registerStudent(form)
      login(out)
      alert(`Welcome, ${out.user.name}! Your account has been created.`)
      navigate('/')
    } catch (e2) {
      alert(e2.message)
    }
  }

  return (
    <section className="form-container">
      <form onSubmit={submit} id="SignUp">
        <h3>register now</h3>
        <input type="text" placeholder="enter your name" className="box" value={form.name} onChange={set('name')} />
        <input type="email" placeholder="enter your email" className="box" value={form.email} onChange={set('email')} />
        <input
          type="text"
          inputMode="numeric"
          placeholder="enter your SAP ID"
          className="box"
          value={form.sapid}
          onChange={(e) => setForm({ ...form, sapid: e.target.value.replace(/\D/g, '').slice(0, 11) })}
        />
        <input type="password" placeholder="enter your password" className="box" value={form.password} onChange={set('password')} />
        <button type="submit" className="btn">Register</button>
        <p>already have an account? <Link to="/login">login now</Link></p>
      </form>
    </section>
  )
}
