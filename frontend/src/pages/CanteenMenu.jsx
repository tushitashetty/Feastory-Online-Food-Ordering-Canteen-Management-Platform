import { useEffect, useMemo, useRef, useState } from 'react'
import { api, imgSrc, money } from '../api'
import { Empty, Heading } from '../components/common'

const NEW_CATEGORY = '__new__'

/**
 * Canteen manager's menu (canteenmenu.html) with the "+ Add Dish" floating
 * button and popup form. Managers can also mark a dish sold-out / available
 * and delete it. Unavailable dishes are shown greyed out here but hidden
 * from students.
 */
export default function CanteenMenu() {
  const [dishes, setDishes] = useState([])
  const [categories, setCategories] = useState([])
  const [q, setQ] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const [form, setForm] = useState({ name: '', calories: '', price: '', category: '', newCategory: '' })

  const load = async () => {
    try {
      const [d, c] = await Promise.all([api.adminDishes(), api.categories()])
      setDishes(d)
      setCategories(c)
    } catch (e) { alert(e.message) }
  }
  useEffect(() => { load() }, [])

  const visible = useMemo(
    () => dishes.filter((d) =>
      (!q || d.name.toLowerCase().includes(q.toLowerCase())) &&
      (!filterCat || d.category?.name === filterCat)),
    [dishes, q, filterCat],
  )

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const onFile = (e) => {
    const f = e.target.files?.[0]
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  const closeForm = () => {
    setOpen(false)
    setForm({ name: '', calories: '', price: '', category: '', newCategory: '' })
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ---- NEW FEATURE: add a dish ---------------------------------------
  const submitDish = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    const price = parseFloat(form.price)
    const calories = form.calories === '' ? null : parseInt(form.calories, 10)
    const category = form.category === NEW_CATEGORY ? form.newCategory.trim() : form.category
    const imageFile = fileRef.current?.files?.[0]

    if (!name || isNaN(price) || price <= 0 || !category) {
      alert('Please fill in all required fields correctly.')
      return
    }
    if (calories !== null && (isNaN(calories) || calories < 0)) {
      alert('Calories must be a positive number.')
      return
    }

    const fd = new FormData()
    fd.append('name', name)
    fd.append('price', String(price))
    fd.append('category', category)
    if (calories !== null) fd.append('calories', String(calories))
    if (imageFile) fd.append('image', imageFile)

    setSaving(true)
    try {
      const dish = await api.adminAddDish(fd)
      alert(`"${dish.name}" added to the menu!`)
      closeForm()
      await load()
    } catch (err) {
      alert(err.message || 'Failed to add dish.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (d) => {
    try {
      await api.adminUpdateDish(d.id, { is_available: !d.is_available })
      await load()
    } catch (e) { alert(e.message) }
  }

  const removeDish = async (d) => {
    if (!confirm(`Delete "${d.name}" from the menu? Past orders keep their record.`)) return
    try {
      await api.adminDeleteDish(d.id)
      await load()
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      <Heading title="our menu" crumb="menu" />

      <section className="search-form">
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="text" className="box" placeholder="Search by name..." maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="box" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </form>
      </section>

      <section className="products">
        <h1 className="title">latest dishes</h1>
        <div className="box-container">
          {visible.map((d) => (
            <div className={`box${d.is_available ? '' : ' sold-out'}`} key={d.id}>
              <button className="fas fa-times" type="button" onClick={() => removeDish(d)} aria-label="delete dish"></button>
              <img src={imgSrc(d.image_url)} alt={d.name} />
              <a className="cat">{d.category?.name}</a>
              <div className="name">{d.name}</div>
              <div className="flex">
                <div className="price"><span>Rs</span>{money(d.price)}<span>/-</span></div>
                <button
                  type="button"
                  className={d.is_available ? 'delete-btn small' : 'btn small'}
                  onClick={() => toggleAvailable(d)}
                >
                  {d.is_available ? 'mark sold out' : 'mark available'}
                </button>
              </div>
              <div className="sub-total">
                {d.calories != null ? `${d.calories} kcal` : 'calories n/a'} · {d.is_available ? 'available' : 'sold out'}
              </div>
            </div>
          ))}
        </div>
        {visible.length === 0 && <Empty>no dishes found!</Empty>}
      </section>

      {/* ---- + Add Dish (same fixed-position button as the original) ---- */}
      <button id="addDishBtn" className="add-dish-btn" onClick={() => setOpen(true)}>+ Add Dish</button>

      {open && (
        <div id="addDishForm" className="add-dish-form">
          <h3>Add New Dish</h3>
          <form onSubmit={submitDish}>
            <label>Dish Name:</label>
            <input type="text" value={form.name} onChange={set('name')} maxLength={100} required />

            <label>Calories (optional):</label>
            <input type="number" min="0" value={form.calories} onChange={set('calories')} />

            <label>Price (₹):</label>
            <input type="number" min="1" step="0.5" value={form.price} onChange={set('price')} required />

            <label>Category:</label>
            <select value={form.category} onChange={set('category')} required>
              <option value="" disabled>select a category</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value={NEW_CATEGORY}>+ new category…</option>
            </select>
            {form.category === NEW_CATEGORY && (
              <input type="text" placeholder="new category name" value={form.newCategory} onChange={set('newCategory')} maxLength={60} required />
            )}

            <label>Image (JPEG/PNG/WEBP, max 5 MB):</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={onFile} />
            {preview && <img src={preview} alt="preview" className="preview" />}

            <div className="actions">
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Submit'}</button>
              <button type="button" onClick={closeForm} className="delete-btn">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
