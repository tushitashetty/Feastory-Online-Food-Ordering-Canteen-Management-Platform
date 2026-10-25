import { useEffect, useState } from 'react'
import { api, fmtDate, money } from '../api'
import { Heading } from '../components/common'
import { useAuth } from '../context/AuthContext'

/** profile.html + a wallet top-up and transaction history (new). */
export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [amount, setAmount] = useState('')
  const [txns, setTxns] = useState([])

  const loadTxns = () => api.transactions().then(setTxns).catch(console.error)
  useEffect(() => { refreshUser(); loadTxns() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const topUp = async (e) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { alert('Enter a valid amount.'); return }
    if (!confirm(`Add ₹${amt} to your eWallet?`)) return
    try {
      await api.topUp(amt)
      await refreshUser()
      await loadTxns()
      setAmount('')
      alert('Wallet topped up!')
    } catch (err) {
      alert(err.message)
    }
  }

  if (!user) return null

  return (
    <>
      <Heading title="my profile" crumb="profile" />

      <section className="user-details">
        <div className="user">
          <img src="/images/user-icon.png" alt="" />
          <p style={{ color: 'black' }}><i className="fas fa-user"></i> Name: <span>{user.name}</span></p>
          <p style={{ color: 'black' }}><i className="fas fa-id-card"></i> SAP ID: <span>{user.sapid}</span></p>
          <p style={{ color: 'black' }}><i className="fas fa-envelope"></i> Email ID: <span>{user.email}</span></p>
          <p style={{ color: 'black' }}><i className="fas fa-wallet"></i> Wallet Balance: <span>Rs.{money(user.balance)}</span></p>

          <form onSubmit={topUp} className="topup">
            <input
              type="number"
              className="box"
              min="1"
              max="10000"
              placeholder="amount to add (Rs)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="submit" className="btn">add money</button>
          </form>
        </div>
      </section>

      {txns.length > 0 && (
        <section className="orders">
          <h1 className="title">wallet history</h1>
          <div className="box-container">
            {txns.map((t) => (
              <div className="box" key={t.id}>
                <p>{fmtDate(t.created_at)}</p>
                <p>
                  {t.kind === 'credit' ? '+' : '-'} <span>Rs.{money(t.amount)}</span>
                  {' '}— {t.note}
                </p>
                <p>balance after: <span>Rs.{money(t.balance_after)}</span></p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
