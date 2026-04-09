import React, { useEffect, useState } from 'react';
import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

function SelectMatchDay({ onSelectMatchDay, onAdmin, tournamentId, tournamentName }) {
  const [matchDays, setMatchDays] = useState([]);

  const formatDisplayDate = (rawDate) => {
    if (!rawDate) return "Date not set";
    const parsed = new Date(`${rawDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return rawDate;

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  };

  useEffect(() => {
    const fetchMatchDays = async () => {
      try {
        if (!tournamentId) return; // Don't try to fetch until we have a tournament ID
        const q = query(
          collection(db, "tournaments", tournamentId, "matches")
        );
        const querySnapshot = await getDocs(q);
        const days = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMatchDays(days);
      } catch (error) {
        console.error("Error loading match days:", error);
      }
    };

    fetchMatchDays();
  }, [tournamentId]);

  return (
    <div className="admin-page-shell">
      <section className="admin-hero-card compact player-select-hero">
        <div className="admin-hero-copy">
          <p className="player-select-hero-intro">
            {tournamentName ? `Welcome to ${tournamentName}.` : "Welcome to the tournament."}
          </p>
          <h2>Select a match day</h2>
        </div>
      </section>

      <section className="admin-section-card">
        {matchDays.length === 0 ? (
          <div className="admin-empty-state">
            <h4>No match days found</h4>
            <p>Create a match day in the admin flow before trying to enter scores.</p>
          </div>
        ) : (
          <div className="selection-card-grid match-day-grid">
            {matchDays.map((day, index) => (
              <button
                className="selection-card match-day-card"
                key={index}
                onClick={() => {
                  console.log("Clicked match day:", day.date);
                  onSelectMatchDay(day.date);
                }}
              >
                <div className="match-day-card-topline">
                  <span className="selection-card-label">Day {index + 1}</span>
                  <strong>{day.course?.course_name || "Course not set"}</strong>
                  <span className="match-day-date">{formatDisplayDate(day.date)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SelectMatchDay;
