import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { api } from '../api'
import { Heading } from '../components/common'

const STEPS = [
  { img: '/images/step-1.png', h3: 'Choose Your Feast', p: 'Craving something? Just tap, pick, and eat—your perfect meal is a scroll away!' },
  { img: '/images/step-2.png', h3: 'Skip the Line, Not the Meal', p: 'Your food’s ready when you are. Just walk in, grab it, and munch away—no lines, no stress!' },
  { img: '/images/step-3.png', h3: 'Fast. Simple. Delicious.', p: 'No stress, no mess—just tap your order and get your meal, easy peasy!' },
]

// Original hard-coded reviews. Live feedback from /feedback is shown first.
const SEED_REVIEWS = [
  { img: '/images/pic-2..png', p: 'Feastory is a total game-changer! I ordered my lunch between lectures and picked it up fresh and hot—no lines, no waiting. Love it!', stars: 5, name: 'Arhaan Bhiwandkar' },
  { img: '/images/pic-1..png', p: 'The canteen food was always good, but now it’s super convenient too! I can browse the menu and pre-order my fav dishes.', stars: 4.5, name: 'Aanchal Shah' },
  { img: '/images/pic-2..png', p: 'Great website and easy to use. Sometimes the food runs out fast though—guess I need to be quicker next time!', stars: 4.5, name: 'Aryan Vora' },
  { img: '/images/pic-2..png', p: 'No more crowd or long lines! I just tap and collect when it’s ready. This is the future of canteen life', stars: 4.5, name: 'Sharvil Gharkar' },
  { img: '/images/pic-1..png', p: 'Honestly, I started eating healthier just because it’s easier to see all the food options. Thanks, Feastory!', stars: 4.5, name: 'Tia Gala' },
  { img: '/images/pic-2..png', p: 'I used to skip lunch just to avoid the crowd—now I actually look forward to it! Feastory makes food feel organized and easy.', stars: 4.5, name: 'Dev Poriya' },
]

function Stars({ n }) {
  const full = Math.floor(n)
  return (
    <div className="stars">
      {Array.from({ length: full }).map((_, i) => <i key={i} className="fas fa-star"></i>)}
      {n % 1 !== 0 && <i className="fas fa-star-half-alt"></i>}
    </div>
  )
}

export default function About() {
  const [reviews, setReviews] = useState(SEED_REVIEWS)
  const { hash } = useLocation()

  useEffect(() => {
    api.reviews(20)
      .then((live) => {
        const fromDb = live.map((r, i) => ({
          img: i % 2 ? '/images/pic-1..png' : '/images/pic-2..png',
          p: r.message,
          stars: r.rating,
          name: r.name,
          key: r.id,
        }))
        setReviews([...fromDb, ...SEED_REVIEWS])
      })
      .catch(console.error)
  }, [])

  // /about#reviews (where the feedback page sends you) scrolls to the slider
  useEffect(() => {
    if (hash === '#reviews') document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
  }, [hash, reviews])

  return (
    <>
      <Heading title="about us" crumb="about" />

      <section className="about">
        <div className="row">
          <div className="image"><img src="/images/about-img.svg" alt="" /></div>
          <div className="content">
            <h3>🍔 About Us – Meet Feastory!</h3>
            <p>
              At Feastory, we’re serving up more than just food—we’re serving convenience, connection,
              and care. We are a smart platform built to simplify how canteens and students interact.
              Canteens can log in, update their daily menus, and receive real-time orders from students.
              No more long queues, confusion, or missed meals—just a smooth, easy-to-use system that
              keeps everyone fed and happy.
            </p>
            <Link to="/menu" className="btn">our menu</Link>
          </div>
        </div>
      </section>

      <section className="steps">
        <h1 className="title">3 simple steps</h1>
        <div className="box-container">
          {STEPS.map((s) => (
            <div className="box" key={s.h3}>
              <img src={s.img} alt="" />
              <h3>{s.h3}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="reviews" id="reviews">
        <h1 className="title">customer reviews</h1>
        <Swiper
          className="reviews-slider"
          modules={[Pagination, Autoplay]}
          loop
          grabCursor
          spaceBetween={20}
          autoplay={{ delay: 5000 }}
          pagination={{ clickable: true }}
          breakpoints={{ 0: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 991: { slidesPerView: 3 } }}
        >
          {reviews.map((r) => (
            <SwiperSlide key={r.key || r.name} className="slide">
              <img src={r.img} alt="" />
              <p>{r.p}</p>
              <Stars n={r.stars} />
              <h3>{r.name}</h3>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>
    </>
  )
}
