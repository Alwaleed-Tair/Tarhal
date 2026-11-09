import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cities } from "../data/cities.js";
import Sidebar from "../components/Sidebar.jsx";
import "./TravelGuide.css";

function OrbitArtwork() {
  return (
    <div className="orbit-art" aria-hidden="true">
      <div className="orbit-ring" />
      <div className="orbit-ring orbit-ring-small" />
      <div className="orbit-sun" />
      <div className="orbit-route" />
      <div className="orbit-ground" />
    </div>
  );
}

export default function TravelGuide() {
  return (
    <>
      <section className="intro" aria-labelledby="welcome-title">
        <div className="intro-copy">
          <p className="eyebrow">A country of many directions</p>
          
          <h1 id="welcome-title">
            Where will you
            <br />
            wander next?
          </h1>
          <p className="intro-note">
            Choose a city. Find a feeling. Start somewhere new across Saudi Arabia.
          </p>
        </div>
        <OrbitArtwork />
      </section>

      <section aria-labelledby="cities-heading">
        <div className="section-heading">
          <div>
            <h2 id="cities-heading">Choose a city to discover</h2>
            <p>Places, stories, and little details worth the journey.</p>
          </div>
          <span className="city-count">09 DESTINATIONS</span>
        </div>

        <div className="city-grid">
          {cities.map((city) => (
            <Link
              key={city.slug}
              to={`/city/${city.slug}`}
              className="city-card"
              aria-label={`Discover ${city.name}`}
              data-testid={`card-city-${city.slug}`}
            >
              <span className="card-visual" aria-hidden="true">
                {city.selectionPhoto ? (
                  <img
                    className="card-photo"
                    src={city.selectionPhoto}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="card-photo-prompt">
                    <ImageIcon size={15} strokeWidth={1.5} />
                    <span>Add city photo</span>
                  </span>
                )}
              </span>
              <span className="card-copy">
                <span>Discover {city.name}</span>
                <span className="card-arrow" aria-hidden="true">
                  <ArrowRight size={18} strokeWidth={1.7} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}