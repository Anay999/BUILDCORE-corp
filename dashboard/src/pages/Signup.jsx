import { useState } from "react";

import axios from "axios";

function Signup({
  setShowSignup,
}) {

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleSignup = async () => {

    try {

      await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          name,
          email,
          password,
        }
      );

      alert(
        "Signup successful 🎉"
      );

      setShowSignup(false);

    } catch (error) {

      console.log(error);

      alert("Signup failed ❌");
    }
  };

  return (

    <div className="login-container">

      <h1>
        📝 Signup
      </h1>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <button
        onClick={handleSignup}
      >
        Signup 🚀
      </button>

      <p
        onClick={() =>
          setShowSignup(false)
        }
        style={{
          cursor: "pointer",
          marginTop: "10px",
        }}
      >

        Already have account?
        Login

      </p>

    </div>
  );
}

export default Signup;