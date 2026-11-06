import { Link, useNavigate } from "react-router-dom";
import ChatWidget from "../components/ChatWidget";
import Airplane1 from "./Terhal/Airplane1.png";

function SignUp() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault(); // stops the page from reloading
    // (later: this is where you'd actually send the signup data to your backend)
    navigate("/login");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-form-panel">
          <div className="login-form-inner">
            <span className="login-logo" role="img" aria-label="camel">
              🐫
            </span>
            <h1>Create Account</h1>
            <p className="login-subtitle">Please enter your details</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <input type="text" name="name" placeholder="Name" autoComplete="name" />
              <input type="text" name="username" placeholder="Username" autoComplete="username" />
              <input type="password" name="password" placeholder="Password" autoComplete="new-password" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                autoComplete="new-password"
              />
              <button type="submit">Sign Up</button>
            </form>

            <p className="login-signup">
              Already have an account? <Link to="/login">Click here to log in.</Link>
            </p>
          </div>
        </div>

        <div className="login-image-panel">
          <img className="login-airplane-img" src={Airplane1} alt="Terhal" />
        </div>
                   <ChatWidget />

      </div>
    </div>
  );
}

export default SignUp;