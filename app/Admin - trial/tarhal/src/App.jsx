import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookingFlow from './pages/BookingFlow';
import Sidebar from "./components/Sidebar";
import Loading from "./pages/Loading";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import FlightBooking from "./pages/FlightBooking";
import Dashboard from "./pages/Dashboard";
import TravelGuide from "./pages/TravelGuide";
import CityGuide from "./pages/CityGuide";
import Bookings from "./pages/Bookings";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
  path="/travelguide"
  element={
    <div className="tarhal-page">
      <div className="travel-layout">
        <Sidebar />
        <main className="travel-main">
          <header className="site-header">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">TARHAL</span>
            </div>
            <div className="header-note">
              <span className="header-dot" />
              Find your next Saudi story
            </div>
          </header>
          <TravelGuide />
        </main>
      </div>
    </div>
  }
/>
<Route path="/flightbooking" element={<FlightBooking />} />
<Route path="/city/:slug" element={<CityGuide />} />
<Route path = "/bookings" element ={<Bookings></Bookings>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;