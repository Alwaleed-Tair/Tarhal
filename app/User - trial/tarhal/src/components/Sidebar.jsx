import { NavLink } from "react-router-dom";
import "./SideBar.css";
import ChatWidget from "./ChatWidget";
import home from "./icons/home.png";
import booking from "./icons/booking.png";
import plane from "./icons/plane.png";
import travelguide from "./icons/travelguide.png";
import settings from "./icons/settings.png";
import tarhallogo from "../pages/Terhal/tarhallogo.png";

const items = [
  { icon: home, label: "Home", to: "/dashboard" },
  { icon: booking, label: "Bookings", to: "/Bookings" },
  { icon: plane, label: "Plane", to: "/flightbooking" },
  { icon: travelguide, label: "Travel Guide", to: "/TravelGuide" },
];

function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-links">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
            aria-label={item.label}
            title={item.label}
          >
            <span
              className="sidebar-icon"
              style={{ "--icon-image": `url(${item.icon})` }}
              aria-hidden="true"
            />
          </NavLink>
        ))}
      </div>

      <div className="sidebar-bottom">
        <NavLink
          className={({ isActive }) =>
            `sidebar-link${isActive ? " active" : ""}`
          }
          to="/settings"
          end
          aria-label="Settings"
          title="Settings"
        >
          <img src={settings} alt="" className="sidebar-settingicon" />
        </NavLink>
        <ChatWidget />
      </div>
    </nav>
  );
}

export default Sidebar;