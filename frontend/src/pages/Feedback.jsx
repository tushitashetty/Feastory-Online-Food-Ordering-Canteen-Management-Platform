import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Heading } from '../components/common'

/**
 * "give feedback" (was contact.html). A submission is stored in the DB,
 * e-mailed to the canteen (Web3Forms, like the original) and shown on the
 * About page under "customer reviews".
 */
export default function Feedback() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', rating: 0, message: '' })
  const [hover, setHover] = useState(0)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{10}$/.test(form.phone)) { alert('Enter a valid 10-digit number.'); return }
    if (!form.rating) { alert('Please give a star rating.'); return }
    setBusy(true)
    try {
      await api.feedback(form)
      alert('Thanks for your feedback! It is now live under customer reviews.')
      setForm({ name: '', phone: '', email: '', rating: 0, message: '' })
      navigate('/about#reviews')
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Heading title="give feedback" crumb="feedback" />

      <section className="contact">
        <div className="row">
          <div className="image"><img src="/images/contact-img.svg" alt="" /></div>
          <form onSubmit={submit}>
            <h3>how was your feast?</h3>
            <input type="text" required placeholder="enter your name" maxLength={50} className="box" value={form.name} onChange={set('name')} />
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="enter your number"
              className="box"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
            <input type="email" required placeholder="enter your email" maxLength={50} className="box" value={form.email} onChange={set('email')} />

            <div className="rating" role="radiogroup" aria-label="rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <i
                  key={n}
                  role="radio"
                  aria-checked={form.rating === n}
                  className={`${n <= (hover || form.rating) ? 'fas' : 'far'} fa-star`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setForm({ ...form, rating: n })}
                ></i>
              ))}
              <span>{form.rating ? `${form.rating}/5` : 'tap to rate'}</span>
            </div>

            <textarea placeholder="tell us what you think" required className="box" cols="30" rows="10" maxLength={500} value={form.message} onChange={set('message')}></textarea>
            <input type="submit" value={busy ? 'sending...' : 'send feedback'} className="btn" disabled={busy} />
          </form>
        </div>
      </section>
    </>
  )
}
