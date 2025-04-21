import React, { useEffect, useState } from 'react';
import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

function SelectMatchDay({ onSelectMatchDay, onAdmin, tournamentId }) {
  const [matchDays, setMatchDays] = useState([]);

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
    <div className="container">
      <h2>Select a Match Day</h2>
      {matchDays.length === 0 && <p>No match days found for this tournament.</p>}
      {matchDays.map((day, index) => (
        <button key={index} onClick={() => {
          console.log("Clicked match day:", day.date);
          onSelectMatchDay(day.date);
        }}>
          {day.date} - {day.course.course_name}
        </button>
      ))}


    </div>
  );
}

export default SelectMatchDay;
