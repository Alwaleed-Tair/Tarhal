import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookingFlow from './pages/BookingFlow';

import Loading from "./pages/Loading";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import FlightBooking from "./pages/FlightBooking";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Loading />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
<Route path="/flightbooking" element={<FlightBooking />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;