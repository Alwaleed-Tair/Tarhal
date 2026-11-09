import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { cities } from "../data/cities.js";
import Sidebar from "../components/Sidebar";
import "./CityGuide.css";
function CityGuideLayout({ children }) {
  return (
    <div className="city-guide-page">
      <div className="city-guide-layout">
        <Sidebar />
        <main className="city-guide-main">
          <header className="city-guide-header">
            <Link className="city-guide-brand" to="/travelguide">
              <span className="city-guide-brand-mark" aria-hidden="true" />
              <span>TARHAL</span>
            </Link>
            <div className="city-guide-header-note">
              <span className="city-guide-header-dot" />
              Find your next Saudi story
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
export default function CityGuide() {
  const { slug } = useParams();
  const city = cities.find((item) => item.slug === slug);
  if (!city) {
    return (
      <CityGuideLayout>
        <section className="city-guide-not-found">
          <p className="city-guide-eyebrow">Destination not found</p>
          <h1>That city isn’t on the map yet.</h1>
          <Link className="city-guide-back-link" to="/travelguide">
            <ArrowLeft size={16} />
            Back to city selection
          </Link>
        </section>
      </CityGuideLayout>
    );
  }
  const places = city.places ?? [];
  return (
    <CityGuideLayout>
      <div className="city-guide-topline">
        <Link className="city-guide-back-link" to="/travelguide">
          <ArrowLeft size={16} />
          All cities
        </Link>
        <span>City guide / {city.region}</span>
      </div>
      <section className="city-guide-hero" data-tone={city.tone}>
        {city.heroPhoto ? (
          <img
            className="city-guide-hero-image"
            src={city.heroPhoto}
            alt={`${city.name} city`}
          />
        ) : (
          <div className="city-guide-hero-placeholder">
            <ImageIcon size={22} />
            <span>Add a photo for {city.name}</span>
          </div>
        )}
        <div className="city-guide-hero-copy">
          <p className="city-guide-eyebrow">Discover Saudi Arabia</p>
          <h1>{city.name} City</h1>
          <p>{city.description}</p>
        </div>
      </section>
      <section className="city-guide-recommendations">
        <div className="city-guide-section-heading">
          <div>
            <h2>Recommended Places to Visit</h2>
            <p>Explore places worth adding to your trip.</p>
          </div>
          <span>{places.length} PLACES</span>
        </div>
        {places.length > 0 ? (
          <div className="city-guide-place-grid">
            {places.map((place) => (
              <article className="city-guide-place-card" key={place.id}>
                {place.photo ? (
                  <img
                    className="city-guide-place-image"
                    src={place.photo}
                    alt={place.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="city-guide-place-placeholder">
                    <ImageIcon size={20} />
                    <span>Add place photo</span>
                  </div>
                )}
                <div className="city-guide-place-title">{place.title}</div>
              </article>
            ))}
          </div>
        ) : (
          <p className="city-guide-empty">Recommended places will be added later.</p>
        )}
        <div className="city-guide-footer-link">
          <span>Want to explore another destination?</span>
          <Link to="/travelguide">Browse all cities</Link>
        </div>
      </section>
    </CityGuideLayout>
  );
}