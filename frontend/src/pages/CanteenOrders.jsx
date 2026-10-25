import { useEffect, useState } from 'react'
import { api, fmtDate, money } from '../api'
import { Heading } from '../components/common'

/**
 * Canteen order board (canteenorders.html): Pending -> Ready to Serve.
 * Polls every 10 s so new student orders appear without a refresh.
 */
export default function CanteenOrders() {
  const [pending, setPending] = useState([])
  const [ready, setReady] = useState([])
  const [servedToday, setServedToday] = useState(0)

  const load = async () => {
    try {
      const [p, r, s] = await Promise.all([
        api.adminOrders('placed'),
        api.adminOrders('ready'),
        api.adminOrders('served'),
      ])
      setPending(p)
      setReady(r)
      const today = new Date().toDateString()
      setServedToday(s.filter((o) => new Date(o.updated_at).toDateString() === today).length)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const setStatus = async (id, status) => {
    try { await api.adminSetStatus(id, status); await load() } catch (e) { alert(e.message) }
  }

  const OrderBox = ({ o, action, label }) => (
    <div className="box">
      <p> placed on : <span>{fmtDate(o.created_at)}</span> </p>
      <p> order id : <span>#{o.id}</span> </p>
      <p> name : <span>{o.student_name}</span> </p>
      <p> sap id : <span>{o.student_sapid}</span> </p>
      <p> items : <span>{o.items.map((i) => `${i.dish_name} x${i.quantity}`).join(', ')}</span> </p>
      <p> total : <span>Rs.{money(o.total_amount)}</span> </p>
      <center>
        <button type="button" className="btn" onClick={() => setStatus(o.id, action)}>{label}</button>
      </center>
    </div>
  )

  return (
    <>
      <Heading title="your orders" crumb="orders" />

      <section className="orders">
        <p className="served-count">served today : <span>{servedToday}</span></p>
        <div className="box-container board">
          <div className="column">
            <h2 className="title">Pending</h2>
            {pending.length === 0 && <p className="empty">no pending orders</p>}
            {pending.map((o) => <OrderBox key={o.id} o={o} action="ready" label="Ready to serve" />)}
          </div>
          <div className="column">
            <h2 className="title">Ready to Serve</h2>
            {ready.length === 0 && <p className="empty">nothing waiting for pickup</p>}
            {ready.map((o) => <OrderBox key={o.id} o={o} action="served" label="Served" />)}
          </div>
        </div>
      </section>
    </>
  )
}
