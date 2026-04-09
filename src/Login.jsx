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
  const [signupComplete, setSignupComplete] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAuth = async () => {
    setLoginError('');

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
        setSignupComplete(true);
        setIsSignup(false);
        return;
      }

      userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        setLoginError("Please verify your email before logging in.");
        return;
      }

      onLogin(userCredential.user);
    } catch (error) {
      console.error("Auth Error:", error.message);
      setLoginError(error.message);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-backdrop" />

      <div className="login-page">
        <section className="login-hero">
          <div className="login-hero-logo-frame">
            <div className="login-hero-logo-ring">
              <img src="/ThumbsUpGolf2.png" alt="Thumbs Up Golf Logo" className="login-hero-logo" />
            </div>
          </div>
          <h1>Run your golf weekend like a real event.</h1>
          <p className="login-hero-copy">
            Join a tournament in seconds, input scores live, and track individual and team
            leaderboards all in one place.
          </p>
        </section>

        <section className="login-panel">
          <div className="login-card login-card-primary">
            <div className="login-card-header">
              <p className="login-eyebrow">Players</p>
              <h2>Join an event</h2>
              <p>Enter your event code to jump right into the tournament.</p>
            </div>

            <div className="login-field-group">
              <label htmlFor="event-code">Event Code</label>
              <input
                id="event-code"
                type="text"
                placeholder="Enter Event Code"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                className="login-code-input"
              />
            </div>

            <button
              className="login-action login-action-accent"
              onClick={() => onJoinWithCode(eventCode.trim())}
            >
              Join as Player
            </button>
          </div>

          <div className="login-card">
            <div className="login-card-header">
              <p className="login-eyebrow">Hosts</p>
              <h2>{isSignup ? 'Create your organizer account' : 'Admin login'}</h2>
              <p>
                {isSignup
                  ? 'Create an account to build tournaments, teams, and match days.'
                  : 'Sign in to create events, edit your setup, and manage scoring.'}
              </p>
            </div>

            <button
              type="button"
              className="login-mode-toggle"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? 'Already have an account? Log in' : 'Need an account? Create one'}
            </button>

            {signupComplete && (
              <div className="login-message login-message-success">
                Account created. Check your email to verify it before logging in.
              </div>
            )}

            {loginError && (
              <div className="login-message login-message-error">
                {loginError}
              </div>
            )}

            <div className="login-field-group">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="login-field-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="login-action" onClick={handleAuth}>
              {isSignup ? 'Create Account' : 'Login'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;
