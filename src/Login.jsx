import React, { useState } from 'react';
import { auth } from './firebase';
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';


function Login({ onLogin, onJoinWithCode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false); // ✅ new
  const [loginError, setLoginError] = useState('');


  const handleAuth = async () => {
    setLoginError(''); // Clear any previous error
    try {
      let userCredential;
      if (isSignup) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
  
        await setDoc(doc(db, "admins", newUser.uid), {
          email: newUser.email,
          createdAt: new Date().toISOString()
        });
  
        await sendEmailVerification(newUser);
        alert("✅ Thanks for signing up! Please check your email to verify your account.");
        return;
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
  
        if (!userCredential.user.emailVerified) {
          setLoginError("⚠️ Please verify your email before logging in.");
          return;
        }
  
        onLogin(userCredential.user);
      }
    } catch (error) {
      console.error("Auth Error:", error.message);
      setLoginError("❌ " + error.message);
    }
  };
  

  return (
    <div style={{ padding: '2rem' }}>
      
            <header style={{ borderBottom: "5px solid #ccc", paddingBottom: "10px", marginBottom: "10px" }}>
        <div className="app-header">
          <img src="/ThumbsUpGolf2.png" alt="Thumbs Up Golf Logo" className="app-logo" />
        </div>
      </header>

      <h2>Join Event with Code</h2>
      <input
        type="text"
        placeholder="Enter Event Code"
        value={eventCode}
        onChange={(e) => setEventCode(e.target.value)}
        style={{ marginBottom: '1rem', width: '65%' }}
      />
      <button onClick={() => onJoinWithCode(eventCode)}>Join as Player</button>
      <hr style={{ margin: '1rem 0' }} />

      <h2>{isSignup ? 'Sign Up to Create Event' : 'Admin Login'}</h2>

      <div style={{ marginTop: '1rem' }}>
        <p onClick={() => setIsSignup(!isSignup)} style={{ cursor: 'pointer', color: 'blue' }}>
          {isSignup ? 'Already have an account? Click here' : 'Need an account? Click here'}
        </p>
      </div>

      {signupComplete && (
        <p style={{ color: "green", marginBottom: "1rem" }}>
          ✅ You're almost done! Please verify your email before logging in.
        </p>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />
      {loginError && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          {loginError}
        </div>
      )}

      <button onClick={handleAuth}>
        {isSignup ? 'Sign Up' : 'Login'}
      </button>


    </div>
  );
}

export default Login;
