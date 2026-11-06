import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Loading.css";
import Tarhallogo1 from "./Terhal/Tarhallogo.png";

function Loading() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 2500); // adjust duration (ms) to match how long you want the animation to play

    return () => clearTimeout(timer); // cleanup if component unmounts early
  }, [navigate]);

  return (
    <div className="loading-page">
      <div className="logo-wrapper">
        <img className="Main-logo" src={Tarhallogo1} alt="Terhal" />
      </div>
      <div className="camel-track">
        
        <div className="camel-walk">🐪</div>
      </div>
    </div>
  );
}

export default Loading;