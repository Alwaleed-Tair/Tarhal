import { Link } from "react-router-dom";
import "./Dashboard.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Airplane1 from "./Terhal/Airplane1.png";
import saudi from "./Terhal/saudi.jpg";
import Riyadh from "./Terhal/Riyadh.png";
import Alula from "./Terhal/Alula.png";


const upcomingFlights = [
  ["Riyadh", "Dammam"],
  ["Jeddah", "Abha"],
  ["Al-Taif", "Riyadh"],
];

function Dashboard() {
  function DayorEvening() {
    const hour = new Date().getHours();
    return hour >= 18 ? "Good evening" : "Good day";
  }

  function Greetings() {
    const now = new Date();
    const day = now.getDay();

    if (day === 5 || day === 6) {
      return "Have a nice weekend";
    }

    return `Have a nice ${now.toLocaleDateString("en", {
      weekday: "long",
    })}`;
  }

  return (
    <div className="Whole-Container">
      <Navbar />
      <Sidebar />

      <div className="Stage">
        <section className="First-Container">
          <div className="Panelfirst">
            <div className="PanelTop" />
            <h2>{DayorEvening()}, Zain Malik!</h2>
            <p>{Greetings()}</p>
          </div>

          <img
            className="Dashboard-Airplane"
            src={Airplane1}
            alt="Airplane"
          />
        </section>

        <Link to="/TravelGuide" className="Travel-Card">
          <div className="Travel-Card-Tab">
            <span>Travel Guide</span>
          </div>
          <img className="Travel-Card-Image" src={saudi} alt="Saudi Arabia" />
          <h3 className="Travel-Card-Title">
            Discover more about Saudi Arabia
          </h3>
        </Link>

        <div className="Destination-Cards">
          <Link to="/TravelGuide" className="Destination-Card">
            <img
              className="Destination-Image"
              src={Alula}
              alt="AlUla, Saudi Arabia"
              style={{ objectPosition: "35% center" }}
            />
            <div className="Destination-Label">
              <span>Discover AlUla</span>
              <span className="Destination-Arrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link>

          <Link to="/TravelGuide" className="Destination-Card">
            <img
              className="Destination-Image"
              src={Riyadh}
              alt="Riyadh, Saudi Arabia"
              style={{ objectPosition: "70% center" }}
            />
            <div className="Destination-Label">
              <span>Discover Riyadh</span>
              <span className="Destination-Arrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link>
        </div>

        <section className="Booking-Cards">
          <article className="Booking-Panel Last-Booking">
            <header className="Booking-Tab">
              <span>Your last booking</span>
            </header>

            <div className="Last-Booking-Content">
              <div className="Booking-Route">
                <span className="Route-Endpoint">
                  <small>From</small>
                  <strong>Jeddah</strong>
                </span>

                <div className="Route-Track" aria-hidden="true">
                  <span className="Route-Dot" />
                  <span className="Route-Line" />
                  <span className="Route-Plane">✈</span>
                  <span className="Route-Line" />
                  <span className="Route-Dot" />
                </div>

                <span className="Route-Endpoint Route-Endpoint--right">
                  <small>To</small>
                  <strong>Abha</strong>
                </span>
              </div>

              <div className="Barcode" aria-hidden="true" />
            </div>
          </article>

          <article className="Booking-Panel Upcoming-Flights">
            <header className="Booking-Tab">
              <span>Upcoming flights</span>
            </header>

            <div className="Upcoming-Flight-List">
              {upcomingFlights.map(([from, to]) => (
                <div className="Flight-Row" key={`${from}-${to}`}>
                  <span className="Flight-Place">
                    <small>From</small>
                    <strong>{from}</strong>
                  </span>

                  <div className="Route-Track" aria-hidden="true">
                    <span className="Route-Dot" />
                    <span className="Route-Line" />
                    <span className="Route-Plane">✈</span>
                    <span className="Route-Line" />
                    <span className="Route-Dot" />
                  </div>

                  <span className="Flight-Place Flight-Place--right">
                    <small>To</small>
                    <strong>{to}</strong>
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;