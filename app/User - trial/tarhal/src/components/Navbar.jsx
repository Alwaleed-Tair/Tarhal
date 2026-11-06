import { Link } from "react-router-dom";
import "./Navbar.css";
import tarhallogo from "../pages/Terhal/Tarhallogo.png";

function Navbar() {
  return <img className ="tarhallogo"src={tarhallogo} alt="Terhal logo" />;
}

export default Navbar;