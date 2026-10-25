import { useEffect, useState } from 'react'
import { api, fmtDate, money } from '../api'
import { Empty, Heading } from '../components/common'

const STATUS_LABEL = { placed: 'placed', ready: 'ready to pick', served: 'served' }

/** Student's own orders (orders.html). Auto-refreshes every 15 s. */
export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      api.myOrders().then(setOrders).catch((e) => alert(e.message)).finally(() => setLoading(false))
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <Heading title="Your Orders" crumb="orders" />

      <section className="orders">
        <h1 className="title">Placed Orders</h1>
        <div className="box-container">
          {orders.map((o) => (
            <div className="box" key={o.id}>
              <p>Placed on: <span>{fmtDate(o.created_at)}</span></p>
              <p>Order ID: <span>#{o.id}</span></p>
              <p>SAP ID: <span>{o.student_sapid}</span></p>
              <p>Items: <span>{o.items.map((i) => `${i.dish_name} x${i.quantity}`).join(', ')}</span></p>
              <p>Total: <span>Rs.{money(o.total_amount)}</span> ({o.payment_method})</p>
              <p>Order Status: <span className={`status status-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span></p>
            </div>
          ))}
        </div>
        {!loading && orders.length === 0 && <Empty>no orders placed yet!</Empty>}
      </section>
    </>
  )
}
