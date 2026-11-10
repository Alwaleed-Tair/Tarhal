/**
 * All of Tariq's stylesheets, in the order his app loads them (main.jsx: index.css, then App.jsx's imports in order,
 * then TarhalScrollbar.css). In his app every file applies to every page, so each page's look depends on the others too;
 * loading them together, in the same order, is what makes the pages here look exactly like his.
 * His files are unchanged copies from origin/User-Fixes (app/Admin - trial/tarhal); vite-plugins/passenger-css.ts scopes
 * them to .passenger-app. passenger-additions.css (the new pieces) comes last.
 */
import './index.css';
import './TarhalBooking.css';
import './SideBar.css';
import './ChatWidget.css';
import './HotelStay.css';
import './BookingFeatures.css';
import './FlightBooking.css';
import './Loading.css';
import './Login.css';
import './Dashboard.css';
import './Navbar.css';
import './TravelGuide.css';
import './CityGuide.css';
import './Bookings.css';
import './TarhalScrollbar.css';
import './passenger-additions.css';
