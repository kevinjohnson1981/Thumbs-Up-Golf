import React, { useState, useEffect } from 'react';
import CourseSelector from './GolfCourseSelector';
import { db } from "./firebase";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

function MatchPlanner({ goBack, teams, setSelectedDate, tournamentId }) {
  const [selectedDateLocal, setSelectedDateLocal] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeeBox, setSelectedTeeBox] = useState(null);
  const [holes, setHoles] = useState([]);
  const [bestBallMatches, setBestBallMatches] = useState([
    { matchTeams: [{ teamName: "", players: [] }, { teamName: "", players: [] }] },
    { matchTeams: [{ teamName: "", players: [] }, { teamName: "", players: [] }] },
  ]);
  const [stablefordPlayers, setStablefordPlayers] = useState(
    teams.map(team => ({ teamName: team.name, player: "" }))
  );
  const [matchType, setMatchType] = useState("");
  const [matchFormat, setMatchFormat] = useState("full18"); // default format
  const [matchSetups, setMatchSetups] = useState([
    { matchLabel: "Match 1", type: "" }
  ]);
  const [existingMatches, setExistingMatches] = useState([]);
  const deleteMatch = async (matchId) => {
    try {
      await deleteDoc(doc(db, "tournaments", tournamentId, "matches", matchId));
      setExistingMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (error) {
      console.error("Error deleting match:", error);
    }
  };
  const [editingMatchId, setEditingMatchId] = useState(null);


  
  useEffect(() => {
    const fetchExistingMatches = async () => {
      if (!tournamentId) return;
  
      try {
        const matchSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "matches"));
        const matches = matchSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExistingMatches(matches);
      } catch (error) {
        console.error("Error fetching existing matches:", error);
      }
    };
  
    fetchExistingMatches();
  }, [tournamentId]);
  

  // ✅ Fetch hole data when a tee box is selected
  useEffect(() => {
    if (selectedTeeBox) {
      fetchHoleData(selectedCourse, selectedTeeBox);
    }
  }, [selectedTeeBox]);

  const fetchHoleData = (selectedCourse, selectedTeeBox) => {
    if (!selectedCourse) {
      console.error("No course selected!");
      return;
    }
  
    if (!selectedTeeBox) {
      console.error("No tee box selected!");
      return;
    }
  
    if (!selectedCourse.tees || typeof selectedCourse.tees !== 'object') {
      console.warn("No tee data available for this course.");
      return;
    }
  
    console.log("Fetching hole data for Course ID:", selectedCourse.id, "Tee:", selectedTeeBox.tee_name);
  
    console.log("Checking selectedCourse data:", selectedCourse);
    console.log("Available tees:", selectedCourse.tees);

    const selectedTee = Object.values(selectedCourse.tees)
      .flat()
      .find(tee => tee.tee_name === selectedTeeBox.tee_name);

    console.log("Selected Tee after filtering:", selectedTee);

  
    if (!selectedTee || !selectedTee.holes) {
      console.warn("No hole data found for this tee:", selectedTeeBox.tee_name);
      return;
    }
  
    setHoles(selectedTee.holes); // ✅ Store hole data
    console.log("Holes loaded successfully:", selectedTee.holes);
  };
  
  

  const addDayToFirebase = async () => {
    if (!selectedDateLocal || !selectedCourse || !selectedTeeBox) {
      alert("Please select a date, course, and tee box and at least one match before adding a day!");
      return;
    }
     
    // ✅ Generate a readable document name based on date
    const timestamp = new Date().getTime();
    const docId = editingMatchId || `match_${selectedDateLocal}_${new Date().getTime()}`;

    // 🛠 Add hole numbers to each hole object
    const holesWithNumbers = holes.map((hole, index) => ({
      ...hole,
      hole: index + 1  // 1 through 18
    }));
  
    const transformedMatches = matchSetups.map((match) => {
      if (match.type === "individualMatch9") {
        const teamAPlayers = match.players?.team0 || [];
        const teamBPlayers = match.players?.team1 || [];
    
        return {
          matchLabel: match.matchLabel,
          type: match.type,
          pairings: {
            front9: [
              { playerA: teamAPlayers[0], playerB: teamBPlayers[0] },
              { playerA: teamAPlayers[1], playerB: teamBPlayers[1] }
            ],
            back9: [
              { playerA: teamAPlayers[0], playerB: teamBPlayers[1] },
              { playerA: teamAPlayers[1], playerB: teamBPlayers[0] }
            ]
          }
        };
      }

      if (match.type === "teamMatch9") {
        return {
          matchLabel: match.matchLabel,
          type: match.type,
          participants: match.participants || {}
        };
      }
    
      // Leave other match types as-is
      return match;
    });
    

    // ✅ Structure match data, including full tee box and hole info
    const newDay = {
      tournamentId,  // ✅ this links it to the right tournament!
      date: selectedDateLocal,
      course: {
        id: selectedCourse.id,
        course_name: selectedCourse.course_name,
        location: selectedCourse.location
      },
      teeBox: {
        tee_name: selectedTeeBox.tee_name,
        total_yards: selectedTeeBox.total_yards,
        holes: holesWithNumbers
      },
      teams,
      matches: transformedMatches
    };
    
    
  
    try {
      const matchDocRef = doc(db, "tournaments", tournamentId, "matches", docId);
      await setDoc(matchDocRef, newDay);

      console.log(`Match Day Added! ID: ${docId}`, newDay);
  
      // ✅ Clear selections after saving
      setSelectedDate("");
      setSelectedDateLocal("");
      setSelectedCourse(null);
      setSelectedTeeBox(null);
      setHoles([]);
      setMatchSetups([{ matchLabel: "Match 1", type: "" }]);
      setEditingMatchId(null);
    } catch (error) {
      console.error("Error adding match day:", error);
    }
  };

   console.log("MatchPlanner - Teams State:", teams);


  return (
    <div>
      
      <h2>Match Planner</h2>
      {existingMatches.length > 0 && (
  <div style={{ marginBottom: '2rem' }}>
    <h3>📅 Existing Match Days</h3>
    {existingMatches.map(match => (
      <div key={match.id} style={{ border: "1px solid gray", padding: "10px", marginBottom: "10px" }}>
        <strong>Date:</strong> {match.date} <br />
        <strong>Course:</strong> {match.course?.course_name || "N/A"} <br />
        <strong>Tee:</strong> {match.teeBox?.tee_name || "N/A"} <br />
        <button onClick={() => {
          setSelectedDate(match.date);
          setSelectedDateLocal(match.date);
          setEditingMatchId(match.id);
          setSelectedCourse(match.course);
          setSelectedTeeBox(match.teeBox);
          setHoles(match.teeBox?.holes || []);
          setMatchSetups(match.matches || []);
        }}>
          ✏️ Edit This Match
        </button>
        <button style={{ marginLeft: '10px', color: 'red' }} onClick={() => deleteMatch(match.id)}>🗑️ Delete</button>

      </div>
    ))}
  </div>
)}

      <button onClick={goBack}>Back to Team Setup</button>

      <h2>Select Date:</h2>
      <input
        type="date"
        value={selectedDateLocal}
        onChange={(e) => {
          const date = e.target.value;
          setSelectedDateLocal(date);  // local state for the input
          setSelectedDate(date);       // notify parent App.jsx
        }}
      />


      <h3>Selected Course: {selectedCourse?.course_name || "No Course Selected"}</h3>
      <CourseSelector 
        setSelectedCourse={(course) => {
          console.log("Course selected:", course);
          setSelectedCourse(course);
          setSelectedTeeBox(null);
        }} 
      />

      {selectedCourse && (
        <div>
          <h3>Select a Tee Box:</h3>
          {selectedCourse?.tees && typeof selectedCourse.tees === 'object' ? (
            Object.values(selectedCourse.tees)
              .flat()
              .map((tee, tIndex) => (
                <button key={tIndex} onClick={() => {
                  console.log("Tee Box Selected:", tee);
                  setSelectedTeeBox(tee);
                }}>            
                  {tee.tee_name} - {tee.total_yards} yards
                </button>
              ))
          ) : (
            <p>No tee boxes available for this course.</p>
          )}
        </div>
      )}

      {selectedTeeBox && (
        <div>
          <h3>Hole Information:</h3>
          {holes.length > 0 ? (
            <ul>
              {holes.map((hole, index) => (
                <li key={index}>
                  Hole {index + 1}: 
                  {hole.yardage ? `${hole.yardage} yards` : " No Yard Data"},
                  Par {hole.par ? hole.par : "Unknown"}, 
                  HCP {hole.handicap ? hole.handicap : "Unknown"}
                </li>              
              ))}
            </ul>
          ) : (
            <p>Loading hole data...</p>
          )}

        </div>
      )}
<h2>Match Setup</h2>
{matchSetups.map((match, index) => (
  <div key={index} style={{ border: '1px solid #aaa', padding: '10px', marginBottom: '1rem' }}>
    <h3>{match.matchLabel}</h3>
    <label>Match Type:</label>
    <button
      style={{ float: "right", color: "red" }}
      onClick={() => {
        const updated = matchSetups
          .filter((_, i) => i !== index)
          .map((match, i) => ({
            ...match,
            matchLabel: `Match ${i + 1}`
          }));
        setMatchSetups(updated);
      }}
      
    >
      ❌ Remove Match
    </button>

    <select
      value={match.type}
      onChange={(e) => {
        const updated = [...matchSetups];
        updated[index].type = e.target.value;
        setMatchSetups(updated);
      }}
    >
      <option value="">Select a match type</option>
      <option value="stroke">Regular Stroke Play</option>
      <option value="teamMatch18">Team Match Play (18 holes)</option>
      <option value="teamMatch9">Team Match Play (Front/Back 9)</option>
      <option value="individualMatch18">Individual Match Play (18 holes)</option>
      <option value="individualMatch9">Individual Match Play (Front/Back 9)</option>
      <option value="stableford">Stableford</option>
    </select>


    
    {match.type === "teamMatch18" && (
  <>
    {[0, 1].map((teamIndex) => (
      <div key={teamIndex}>
        <label>{`Team ${teamIndex + 1}:`}</label>
        <select
          value={match.participants?.[`team${teamIndex + 1}`]?.teamName || ""}
          onChange={(e) => {
            const updated = [...matchSetups];
            const teamName = e.target.value;
            updated[index].participants = {
              ...updated[index].participants,
              [`team${teamIndex + 1}`]: {
                teamName,
                players: []
              }
            };
            setMatchSetups(updated);
          }}
        >
          <option value="">Select Team</option>
          {teams.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>

        {/* Player checkboxes */}
        {teams.find(t => t.name === match.participants?.[`team${teamIndex + 1}`]?.teamName)?.players.map((p, pIndex) => (
          <label key={pIndex} className="checkbox-label">
          <input
            type="checkbox"
            checked={match.participants?.[`team${teamIndex + 1}`]?.players.includes(p.name)}
            onChange={(e) => {
              const updated = [...matchSetups];
              const selected = updated[index].participants[`team${teamIndex + 1}`]?.players || [];
              const name = p.name;
        
              if (e.target.checked && selected.length < 2) {
                updated[index].participants[`team${teamIndex + 1}`].players = [...selected, name];
              } else {
                updated[index].participants[`team${teamIndex + 1}`].players = selected.filter(n => n !== name);
              }
              setMatchSetups(updated);
            }}
          />
          {p.name}
        </label>
        
        ))}
      </div>
    ))}
  </>
)}
{match.type === "teamMatch9" && (
  <>
    {[0, 1].map((teamIndex) => (
      <div key={teamIndex}>
        <label>{`Team ${teamIndex + 1}:`}</label>
        <select
          value={match.participants?.[`team${teamIndex}`]?.teamName || ""}
          onChange={(e) => {
            const updated = [...matchSetups];
            const teamName = e.target.value;
            if (!updated[index].participants) updated[index].participants = {};
            updated[index].participants[`team${teamIndex}`] = {
              teamName,
              players: []
            };
            setMatchSetups(updated);
          }}
        >
          <option value="">Select Team</option>
          {teams.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>

        {/* Player checkboxes */}
        {teams.find(t => t.name === match.participants?.[`team${teamIndex}`]?.teamName)?.players.map((p, pIndex) => (
          <label key={pIndex} className="checkbox-label">
            <input
              type="checkbox"
              checked={match.participants?.[`team${teamIndex}`]?.players.includes(p.name)}
              onChange={(e) => {
                const updated = [...matchSetups];
                const selected = updated[index].participants[`team${teamIndex}`]?.players || [];
                const name = p.name;

                if (e.target.checked && selected.length < 2) {
                  updated[index].participants[`team${teamIndex}`].players = [...selected, name];
                } else {
                  updated[index].participants[`team${teamIndex}`].players = selected.filter(n => n !== name);
                }
                setMatchSetups(updated);
              }}
            />
            {p.name}
          </label>
        ))}
      </div>
    ))}
  </>
)}


{match.type === "individualMatch18" && (
  <div>
    <h4>Pairings (18 Holes):</h4>
    {Array.from({ length: 2 }).map((_, pairIndex) => (
      <div key={`pair-${pairIndex}`} style={{ marginBottom: '1rem' }}>
        <strong>Pairing {pairIndex + 1}:</strong>
        <div>
          <label>Player A:</label>
          <select
            value={match.pairings?.[pairIndex]?.playerA || ""}
            onChange={(e) => {
              const updated = [...matchSetups];
              if (!updated[index].pairings) updated[index].pairings = [];
              if (!updated[index].pairings[pairIndex]) updated[index].pairings[pairIndex] = {};
              updated[index].pairings[pairIndex].playerA = e.target.value;
              setMatchSetups(updated);
            }}
          >
            <option value="">Select</option>
            {teams.flatMap(team => team.players).map((p, i) => (
              <option key={`a-${i}`} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Player B:</label>
          <select
            value={match.pairings?.[pairIndex]?.playerB || ""}
            onChange={(e) => {
              const updated = [...matchSetups];
              if (!updated[index].pairings) updated[index].pairings = [];
              if (!updated[index].pairings[pairIndex]) updated[index].pairings[pairIndex] = {};
              updated[index].pairings[pairIndex].playerB = e.target.value;
              setMatchSetups(updated);
            }}
          >
            <option value="">Select</option>
            {teams.flatMap(team => team.players).map((p, i) => (
              <option key={`b-${i}`} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    ))}
  </div>
)}


{match.type === "individualMatch9" && (
  <div>
    {/* TEAM SELECTION */}
    {[0, 1].map((teamIndex) => (
      <div key={teamIndex}>
        <label>Team {teamIndex + 1}:</label>
        <select
          value={match[`team${teamIndex}`] || ""}
          onChange={(e) => {
            const updated = [...matchSetups];
            updated[index][`team${teamIndex}`] = e.target.value;
            updated[index].players = updated[index].players || { team0: [], team1: [] };
            setMatchSetups(updated);
          }}
        >
          <option value="">Select Team</option>
          {teams.map((team) => (
            <option key={team.name} value={team.name}>{team.name}</option>
          ))}
        </select>

        {/* SELECT 2 PLAYERS FROM THIS TEAM */}
        {teams.find(t => t.name === match[`team${teamIndex}`])?.players.map((p, pIndex) => (
          <label key={pIndex} className="checkbox-label">
            <input
              type="checkbox"
              checked={match.players?.[`team${teamIndex}`]?.includes(p.name) || false}
              onChange={(e) => {
                const updated = [...matchSetups];
                const players = updated[index].players?.[`team${teamIndex}`] || [];

                if (e.target.checked && players.length < 2) {
                  updated[index].players[`team${teamIndex}`] = [...players, p.name];
                } else {
                  updated[index].players[`team${teamIndex}`] = players.filter(name => name !== p.name);
                }

                setMatchSetups(updated);
              }}
            />
            {p.name}
          </label>
        ))}
      </div>
    ))}
  </div>
)}


{match.type === "stroke" && (
  <div>
    <h4>Stroke Play Participants</h4>
    {teams.flatMap((team) =>
      team.players.map((player, idx) => {
        const isChecked = match.participants?.[player.name] ?? false;
        return (
          <div key={`${team.name}-${idx}`} style={{ marginLeft: "1px" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  const updated = [...matchSetups];
                  if (!updated[index].participants) {
                    updated[index].participants = {};
                  }
                  updated[index].participants[player.name] = e.target.checked;
                  setMatchSetups(updated);
                }}
              />
              {player.name}
            </label>
          </div>
        );
      })
    )}
  </div>
)}

{match.type === "stableford" && (
  <div>
    <h4>Select Players for Stableford</h4>
    {teams.map((team, teamIndex) => (
      <div key={teamIndex}>
        <strong>{team.name}</strong>
        {team.players.map((player, pIndex) => (
          <label key={pIndex} className="checkbox-label">
            <input
              type="checkbox"
              checked={match.participants?.includes(player.name)}
              onChange={(e) => {
                const updated = [...matchSetups];
                const current = updated[index].participants || [];
                if (e.target.checked) {
                  updated[index].participants = [...current, player.name];
                } else {
                  updated[index].participants = current.filter(name => name !== player.name);
                }
                setMatchSetups(updated);
              }}
            />
            {player.name}
          </label>
        ))}
      </div>
    ))}
  </div>
)}

  </div>
  
))}

{matchSetups.length < 20 && (
  <button onClick={() => {
    const nextMatchNumber = matchSetups.length + 1;
    const newMatch = {
      matchLabel: `Match ${nextMatchNumber}`,
      type: ""
    };
    setMatchSetups([...matchSetups, newMatch]);
  }}
>
    ➕ Add Match
  </button>
)}


<button onClick={addDayToFirebase}>{editingMatchId ? "Update Day" : "Add Day"}</button>

    </div>
  );
}

export default MatchPlanner;
