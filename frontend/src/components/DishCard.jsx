import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, imgSrc, money } from '../api'
import { useAuth } from '../context/AuthContext'

/**
 * One `.products .box` exactly as the original menu/home cards:
 * hover-in cart button, image, category, name, price + qty input.
 */
export default function DishCard({ dish }) {
  const [qty, setQty] = useState(1)
  const { isStudent } = useAuth()
  const navigate = useNavigate()

  const addToCart = async () => {
    if (!isStudent) {
      alert('User not logged in!')
      navigate('/login')
      return
    }
    try {
      await api.addToCart(dish.id, Number(qty) || 1)
      alert(`${dish.name} added to cart!`)
    } catch (e) {
      alert(e.message || 'Failed to add to cart.')
    }
  }

  return (
    <div className="box">
      <button className="fas fa-shopping-cart" type="button" onClick={addToCart} aria-label="add to cart"></button>
      <img src={imgSrc(dish.image_url)} alt={dish.name} />
      <a className="cat">{dish.category?.name}</a>
      <div className="name">{dish.name}</div>
      <div className="flex">
        <div className="price"><span>Rs</span>{money(dish.price)}<span>/-</span></div>
        <input
          type="number"
          className="qty"
          min="1"
          max="99"
          value={qty}
          onChange={(e) => setQty(e.target.value.slice(0, 2))}
        />
      </div>
      {dish.calories != null && <div className="sub-total">{dish.calories} kcal</div>}
    </div>
  )
}
