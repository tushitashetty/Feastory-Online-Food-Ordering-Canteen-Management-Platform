import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import DishCard from '../components/DishCard'
import { Empty, Heading } from '../components/common'

/** Student menu: search box + category dropdown + dish grid (menu.html). */
export default function Menu() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.categories().then(setCategories).catch(console.error) }, [])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      api.menu({ q, category })
        .then(setDishes)
        .catch((e) => alert(e.message))
        .finally(() => setLoading(false))
    }, 200)
    const next = {}
    if (q) next.q = q
    if (category) next.category = category
    setParams(next, { replace: true })
    return () => clearTimeout(t)
  }, [q, category]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Heading title="our menu" crumb="menu" />

      <section className="search-form">
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            className="box"
            placeholder="Search by name..."
            maxLength={100}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="box" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </form>
      </section>

      <section className="products">
        <h1 className="title">dishes</h1>
        <div className="box-container">
          {dishes.map((d) => <DishCard key={d.id} dish={d} />)}
        </div>
        {!loading && dishes.length === 0 && <Empty>no dishes found!</Empty>}
      </section>
    </>
  )
}
