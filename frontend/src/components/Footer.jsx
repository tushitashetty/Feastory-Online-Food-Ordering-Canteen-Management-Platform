import { Link } from 'react-router-dom'

/** Footer copied from the original pages (Laxmi Caterers block). */
export default function Footer() {
  return (
    <footer>
      <div className="row">
        <div className="col">
          <h1><i>Welcome to Laxmi Caterers!</i></h1>
          <br /><br />
          <p>
            Hungry between lectures? Craving a quick bite or a refreshing drink? Our canteen is your
            go-to spot! From crispy samosas to cheesy sandwiches, from chai breaks to chilled frappés,
            we’ve got all your cravings covered. Whether you’re here for a power meal before class or
            just chilling with friends, we serve up good food and even better vibes.
          </p>
        </div>
        <div className="col">
          <h3 style={{ color: '#fed330' }}>
            Office <div className="underline"><span></span></div>
          </h3>
          <p>
            Mukesh Patel School Of Technology and Management VPD Scheme, Vile Parle West Mumbai,
            Maharashtra 400047, India
          </p>
          <p className="email-id">thefeastory@gmail.com</p>
          <h4>+91 - 0123456789</h4>
        </div>
        <div className="col">
          <h3 style={{ color: '#fed330' }}>
            Links <div className="underline"><span></span></div>
          </h3>
          <ul>
            <li><Link to="/login">Log In</Link></li>
            <li><Link to="/feedback">Give Feedback</Link></li>
            <li><Link to="/about">About Us</Link></li>
          </ul>
        </div>
        <div className="col">
          <img src="/images/laxmicaterslogo.png" className="logo" alt="Laxmi Caterers" />
        </div>
      </div>
      <hr />
    </footer>
  )
}
