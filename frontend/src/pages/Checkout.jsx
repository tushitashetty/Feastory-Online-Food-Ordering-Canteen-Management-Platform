import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { api, money } from '../api'
import { Heading } from '../components/common'
import { useAuth } from '../context/AuthContext'

/** Same bill the original generated with jsPDF after a successful order. */
function downloadBill(order, student) {
  const doc = new jsPDF()
  let y = 20
  doc.setFontSize(18)
  doc.text('Laxmi Caterers - Order Bill', 70, y); y += 10
  doc.setFontSize(12)
  doc.text(`Order ID: ${order.id}`, 20, y); y += 7
  doc.text(`SAP ID: ${student.sapid}`, 20, y); y += 7
  doc.text(`Name: ${student.name}`, 20, y); y += 7
  doc.text(`Placed on: ${new Date(order.created_at).toLocaleString('en-IN')}`, 20, y); y += 10
  doc.text('Items Ordered:', 20, y); y += 10
  doc.text('Dish Name', 20, y); doc.text('Quantity', 100, y); doc.text('Price (Rs)', 150, y); y += 10
  order.items.forEach((it) => {
    doc.text(it.dish_name, 20, y)
    doc.text(String(it.quantity), 100, y)
    doc.text(money(it.unit_price * it.quantity), 150, y)
    y += 10
  })
  y += 10
  doc.setFontSize(14)
  doc.text(`Grand Total: Rs.${money(order.total_amount)}`, 20, y)
  doc.save(`Bill_Order_${order.id}.pdf`)
}

export default function Checkout() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState({ items: [], total: 0 })
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.cart().then(setCart).catch((e) => alert(e.message)) }, [])

  const placeOrder = async () => {
    if (method !== 'eWallet') { alert('Please select a payment method.'); return }
    if (cart.items.length === 0) { alert('Your cart is empty.'); return }
    if (!confirm(`Your total is ₹${money(cart.total)}. Do you approve this transaction?`)) return
    setBusy(true)
    try {
      const { order, new_balance } = await api.checkout(method)
      downloadBill(order, user)
      await refreshUser()
      alert(`Order placed successfully! Your new balance is ₹${money(new_balance)}.`)
      navigate('/orders')
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Heading title="checkout" />

      <section className="checkout">
        <h1 className="title">order summary</h1>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="cart-items">
            <h3>cart items</h3>
            {cart.items.length === 0 && <p><span className="name">your cart is empty!</span></p>}
            {cart.items.map((it) => (
              <p key={it.id}>
                <span className="name">{it.dish.name} ({it.quantity} x Rs.{money(it.dish.price)})</span>
                <span className="price">Rs.{money(it.dish.price * it.quantity)}</span>
              </p>
            ))}
            <p className="grand-total">
              <span className="name">grand total :</span>
              <span className="price">Rs.{money(cart.total)}</span>
            </p>
            <Link to="/cart" className="btn">view cart</Link>
          </div>

          <div className="user-info">
            <h3>your info</h3>
            <p><i className="fas fa-user"></i> <span>{user?.name}</span></p>
            <p><i className="fas fa-id-card"></i> <span>{user?.sapid}</span></p>
            <p><i className="fas fa-envelope"></i> <span>{user?.email}</span></p>
            <p><i className="fas fa-wallet"></i> <span>wallet balance : Rs.{money(user?.balance ?? 0)}</span></p>
            <select name="method" className="box" required value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="" disabled>select payment method</option>
              <option value="eWallet">eWallet</option>
            </select>
          </div>

          <button type="button" className="btn order-btn" onClick={placeOrder} disabled={busy}>
            {busy ? 'placing order...' : 'place order'}
          </button>
        </form>
      </section>
    </>
  )
}
