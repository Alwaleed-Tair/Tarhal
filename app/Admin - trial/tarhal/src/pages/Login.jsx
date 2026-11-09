import { Link } from "react-router-dom";
import "./Login.css";
import Airplane1 from "./Terhal/Airplane1.png";
import ChatWidget from "../components/ChatWidget";
import { useNavigate } from "react-router-dom";  /* This is like <link>*/

function Login() {
   const navigate = useNavigate();
   const handleSubmit = (e) => {
  e.preventDefault();
   navigate("/dashboard");
};

  return (
    <div className="login-page">
      
      <div className="login-container">
        
        <div className="login-form-panel">
          <div className="login-form-inner">
            <span className="login-logo" role="img" aria-label="camel">
              🐫
            </span>
            <h1>Welcome Home</h1>
            <p className="login-subtitle">Please enter your details</p>

            <form onSubmit={handleSubmit} className="login-form">
              <input
                type="text"
                name="username"
                placeholder="Username"
                autoComplete="username"
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
              />

              <button type="submit">Login  </button>
            </form>

            <p className="login-signup">
              Don't have an account? <Link to="/signup">Sign up here.</Link>
            </p>
          </div>
        </div>

        <div className="login-image-panel">
          
          <img className="login-airplane-img" src={Airplane1} alt="Terhal" /></div>
  <ChatWidget />
      </div>
    </div>
  );
}

export default Login;