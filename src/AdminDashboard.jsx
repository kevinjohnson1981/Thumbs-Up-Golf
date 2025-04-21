// AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function AdminDashboard({ user, onStartNew, onSelectTournament, onDeleteTournament }) {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!user) return;

      const q = query(collection(db, "tournaments"), where("adminId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTournaments(fetched);
    };

    fetchTournaments();
  }, [user]);

  return (
    <div style={{ padding: "0rem" }}>
      <h2>Welcome, {user.email}!</h2>

      <h3>Your Tournaments:</h3>
      {tournaments.length > 0 ? (
        tournaments.map((t) => (
          <div key={t.id} style={{ marginBottom: "0rem" }}>
            <strong>{t.name}</strong>
            <button onClick={() => onSelectTournament(t)}>Edit</button>
            <button
              onClick={() => onDeleteTournament(t.id)}
              style={{
                marginLeft: "10px",
                backgroundColor: "red",
                color: "white",
                border: "none",
                padding: "10px 10px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))
      ) : (
        <p>No tournaments yet.</p>
      )}

      <button onClick={onStartNew} style={{ marginTop: "1rem" }}>
        ➕ Start New Tournament
      </button>
    </div>
  );
}

export default AdminDashboard;
