import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFlip, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-flip'
import 'swiper/css/pagination'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DishCard from '../components/DishCard'

const SLIDES = [
  { span: 'Your Meal, Just a Click Away.', h3: <i>Slice into happiness with every bite!, Order Now!</i>, img: '/images/bg2.png' },
  { span: 'order now', h3: 'Crispy, golden dosa – a bite of South Indian bliss!', img: '/images/bg3.png' },
  { span: 'order now', h3: 'Chilled to thrill – your perfect Cold Coffee fix!', img: '/images/bg4.png' },
]

const CATEGORIES = [
  { img: '/images/cat-1.png', name: 'quick Bites', filter: 'Breakfast' },
  { img: '/images/cat-2.png', name: 'main dishes', filter: 'North Indian' },
  { img: '/images/cat-3.png', name: 'drinks', filter: 'Juices' },
  { img: '/images/cat-4.png', name: 'desserts', filter: '' },
]

export default function Home() {
  const { isStaff } = useAuth()
  const [dishes, setDishes] = useState([])
  const [popular, setPopular] = useState(false) // true when showing today's most-ordered

  // "most ordered today"; before the first order of the day fall back to latest dishes
  useEffect(() => {
    if (isStaff) return
    api.popularToday(6)
      .then((top) => {
        if (top.length) { setDishes(top); setPopular(true); return }
        return api.menu({ limit: 6 }).then((latest) => { setDishes(latest); setPopular(false) })
      })
      .catch(console.error)
  }, [isStaff])

  return (
    <>
      <section className="home">
        <Swiper
          className="home-slider"
          modules={[EffectFlip, Pagination, Autoplay]}
          effect="flip"
          loop
          grabCursor
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
        >
          {SLIDES.map((s, i) => (
            <SwiperSlide key={i} className="slide">
              <div className="content">
                <span>{s.span}</span>
                <h3>{s.h3}</h3>
                <Link to={isStaff ? '/canteen/menu' : '/menu'} className="btn">see menus</Link>
              </div>
              <div className="image">
                <img src={s.img} alt="" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* The manager's home page is just the banner (no categories / dishes) */}
      {!isStaff && (<>
      <section className="category">
        <h1 className="title">food category</h1>
        <div className="box-container">
          {CATEGORIES.map((c) => (
            <Link key={c.name} to={c.filter ? `/menu?category=${encodeURIComponent(c.filter)}` : '/menu'} className="box">
              <img src={c.img} alt="" />
              <h3>{c.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="products">
        <h1 className="title">{popular ? "today's most ordered" : 'latest dishes'}</h1>
        <div className="box-container">
          {dishes.map((d) => <DishCard key={d.id} dish={d} />)}
        </div>
        <div className="more-btn">
          <Link to="/menu" className="btn">View all</Link>
        </div>
      </section>
      </>)}
    </>
  )
}
