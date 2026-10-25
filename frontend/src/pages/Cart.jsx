import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, imgSrc, money } from '../api'
import { Empty, Heading } from '../components/common'

/** Shopping cart (cart.html): grand total bar, item boxes with ✕, delete-all. */
export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const load = () =>
    api.cart().then(setCart).catch((e) => alert(e.message)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const changeQty = async (item, qty) => {
    qty = Math.max(1, Math.min(99, Number(qty) || 1))
    try { setCart(await api.updateCartItem(item.id, qty)) } catch (e) { alert(e.message) }
  }

  const deleteItem = async (item) => {
    if (!confirm('Delete this item?')) return
    try { setCart(await api.removeCartItem(item.id)) } catch (e) { alert(e.message) }
  }

  const deleteAll = async (e) => {
    e.preventDefault()
    if (!confirm('Delete all from cart?')) return
    try { setCart(await api.clearCart()) } catch (e) { alert(e.message) }
  }

  return (
    <>
      <Heading title="shopping cart" crumb="cart" />

      <section className="products">
        <h1 className="title">your cart</h1>

        <div className="cart-total">
          <p>grand total : <span>Rs.{money(cart.total)}</span></p>
          {cart.items.length > 0 && <Link to="/checkout" className="btn">checkout orders</Link>}
        </div>

        <div className="box-container">
          {cart.items.map((item) => (
            <div className="box" key={item.id}>
              <button className="fas fa-times" type="button" onClick={() => deleteItem(item)} aria-label="remove"></button>
              <img src={imgSrc(item.dish.image_url)} alt={item.dish.name} />
              <a className="cat">{item.dish.category?.name}</a>
              <div className="name">{item.dish.name}</div>
              <div className="flex">
                <div className="price"><span>Rs</span>{money(item.dish.price)}<span>/-</span></div>
                <input
                  type="number"
                  className="qty"
                  min="1"
                  max="99"
                  value={item.quantity}
                  onChange={(e) => changeQty(item, e.target.value)}
                />
              </div>
              <div className="sub-total">
                sub total : <span>Rs.{money(item.dish.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        {!loading && cart.items.length === 0 && <Empty>your cart is empty!</Empty>}

        {cart.items.length > 0 && (
          <div className="more-btn">
            <a href="#" className="delete-btn" onClick={deleteAll}>delete all</a>
          </div>
        )}
      </section>
    </>
  )
}
