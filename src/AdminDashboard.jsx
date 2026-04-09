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
      const fetched = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTournaments(fetched);
    };

    fetchTournaments();
  }, [user]);

  return (
    <div className="admin-page-shell">
      <section className="admin-hero-card">
        <div className="admin-hero-copy">
          <p className="admin-eyebrow">Organizer Dashboard</p>
          <h2>Welcome back{user?.email ? `, ${user.email}` : ""}</h2>
          <p>
            Create a new tournament, jump back into an existing weekend, or clean up an old event.
          </p>
        </div>

        <button className="admin-primary-button" onClick={onStartNew}>
          Start New Tournament
        </button>
      </section>

      <section className="admin-section-card">
        <div className="admin-section-header">
          <div>
            <p className="admin-eyebrow">Your Events</p>
            <h3>Tournaments</h3>
          </div>
          <span className="admin-count-pill">{tournaments.length}</span>
        </div>

        {tournaments.length > 0 ? (
          <div className="tournament-card-grid">
            {tournaments.map((tournament) => (
              <article key={tournament.id} className="tournament-card">
                <div className="tournament-card-top">
                  <div>
                    <h4>{tournament.name || "Untitled Tournament"}</h4>
                    <p className="tournament-card-subtitle">
                      Event Code: {tournament.eventCode || "Not set"}
                    </p>
                  </div>
                  <div
                    className="tournament-theme-dot"
                    style={{ backgroundColor: tournament.theme === "mastersGreen"
                      ? "#176308"
                      : tournament.theme === "sunsetGold"
                      ? "#c38b33"
                      : tournament.theme === "midnight"
                      ? "#1f2937"
                      : tournament.theme === "classicBlue"
                      ? "#3f33c4"
                      : "#8a8a8a" }}
                  />
                </div>

                <div className="tournament-card-meta">
                  <span>{tournament.numTeams || 0} teams</span>
                  <span>{tournament.playersPerTeam || 0} players per team</span>
                </div>

                <div className="tournament-card-actions">
                  <button onClick={() => onSelectTournament(tournament)}>
                    Open Setup
                  </button>
                  <button
                    className="admin-danger-button"
                    onClick={() => onDeleteTournament(tournament.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <h4>No tournaments yet</h4>
            <p>Create your first event to start building teams, match days, and leaderboards.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
