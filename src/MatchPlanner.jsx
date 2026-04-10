import React, { useState, useEffect } from 'react';
import CourseSelector from './GolfCourseSelector';
import { db } from "./firebase";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

function MatchPlanner({ goBack, teams, setSelectedDate, tournamentId }) {
  const [selectedDateLocal, setSelectedDateLocal] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeeBox, setSelectedTeeBox] = useState(null);
  const [holes, setHoles] = useState([]);
  const [originalHoles, setOriginalHoles] = useState([]);
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
  const [excludeFromIndividual, setExcludeFromIndividual] = useState(false);


  
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
    setOriginalHoles(selectedTee.holes);
    console.log("Holes loaded successfully:", selectedTee.holes);
  };

  const updateHoleField = (holeIndex, field, value) => {
    const parsedValue = value === "" ? "" : parseInt(value, 10);
    setHoles((prev) =>
      prev.map((hole, index) =>
        index === holeIndex
          ? { ...hole, [field]: Number.isNaN(parsedValue) ? "" : parsedValue }
          : hole
      )
    );
  };

  // remove every key whose value is undefined OR an array element that is undefined
const deepClean = (obj) => {
  if (Array.isArray(obj)) {
    return obj
      .map(deepClean)
      .filter((v) => v !== undefined);        // drop undefined array items
  }
  if (obj !== null && typeof obj === "object") {
    const cleaned = {};
    Object.entries(obj).forEach(([k, v]) => {
      const cv = deepClean(v);
      if (cv !== undefined) cleaned[k] = cv;  // keep only defined values
    });
    return cleaned;
  }
  return obj;                                // primitives
};

  // ──────────────────────────────────────────────
// Helper: replace one match object in matchSetups
// ──────────────────────────────────────────────
const updateMatchSetup = (idx, newMatch) => {
  setMatchSetups(prev =>
    prev.map((m, i) => (i === idx ? newMatch : m))
  );
};

const formatPlayerOptionLabel = (player) => {
  const handicap = player?.handicap ?? "";
  return handicap === "" ? player.name : `${player.name} (${handicap})`;
};

const getIndividualNineBackNinePlayers = (playersA = [], playersB = []) => {
  if (playersA.length === 2 && playersB.length === 1) {
    return { playersA: [playersA[1]], playersB };
  }

  return { playersA, playersB: [...playersB].reverse() };
};

  

  const addDayToFirebase = async () => {
    if (!selectedDateLocal || !selectedCourse || !selectedTeeBox) {
      alert("Please select a date, course, tee box and at least one match.");
      return;
    }

    // after the initial tee / date / course checks
    for (const m of matchSetups) {
      if (m.type === "individualMatch9") {
        const a = m.front9?.playersA || [];
        const b = m.front9?.playersB || [];
        const isValidIndividualNine =
          ((a.length === 2 && b.length === 2) ||
          (a.length === 1 && b.length === 2) ||
          (a.length === 2 && b.length === 1));

        if (!isValidIndividualNine) {
          alert(`${m.matchLabel}: please choose two players from at least one team and one or two from the other team.`);
          return;
        }
      }
    }
    

  
    const docId = editingMatchId || `match_${selectedDateLocal}_${Date.now()}`;
  
    // add hole numbers 1-18
    const holesWithNumbers = holes.map((h, i) => ({ ...h, hole: i + 1 }));
  
    /* ---------- 1.  Build matches exactly as we want them in Firestore ---------- */
    const transformedMatches = matchSetups.map((match) => {
      // ── Individual match play 9 holes ──────────────────────────────────────────
      if (match.type === "individualMatch9") {
        /** helper to turn two player arrays into [{playerA,playerB}, …] */
        const makePairs = (playersA = [], playersB = []) => {
          const len = Math.max(playersA.length, playersB.length);
          const pairs = [];
          for (let i = 0; i < len; i++) {
            if (playersA[i] && playersB[i]) {
              pairs.push({ playerA: playersA[i], playerB: playersB[i] });
            }
          }
          return pairs;
        };
      
        const f9 = match.front9 || {};
        const generatedBack9 = getIndividualNineBackNinePlayers(f9.playersA, f9.playersB);
        const b9 = {
          teamA: f9.teamA || "",
          playersA: generatedBack9.playersA,
          teamB: f9.teamB || "",
          playersB: generatedBack9.playersB
        };
      
        return {
          matchLabel: match.matchLabel,
          type      : "individualMatch9",
      
          // save the raw selections (helpful when you re-open to edit later)
          front9: {
            teamA   : f9.teamA   || "",
            playersA: f9.playersA || [],
            teamB   : f9.teamB   || "",
            playersB: f9.playersB || []
          },
          back9: {
            teamA   : b9.teamA   || "",
            playersA: b9.playersA || [],
            teamB   : b9.teamB   || "",
            playersB: b9.playersB || []
          },
      
          // generate the pairings array that the rest of the app expects
          pairings: {
            front9: makePairs(f9.playersA, f9.playersB),
            back9 : makePairs(b9.playersA, b9.playersB)
          },
      
          ...(match.excludeFromIndividual ? { excludeFromIndividual: true } : {})
        };
      }
      return match;
    }); 
  
    /* ---------- 2.  Assemble the “day” document ------------------------------- */
    const newDay = {
      tournamentId,
      date: selectedDateLocal,
      course: {
        id          : selectedCourse.id,
        course_name : selectedCourse.course_name,
        location    : selectedCourse.location
      },
      teeBox: {
        tee_name    : selectedTeeBox.tee_name,
        total_yards : selectedTeeBox.total_yards,
        holes       : holesWithNumbers
      },
      teams,
      matches: transformedMatches                     // ← save the transformed list
    };
  
  /* ---------- 3.  Clean & write to Firestore ------------------------------- */
  try {
    const cleanDay = deepClean(newDay);            // ✨  strip undefineds
    console.log("About to save day doc:", cleanDay);

    await setDoc(
      doc(db, "tournaments", tournamentId, "matches", docId),
      cleanDay
    );

    console.log(`Match day saved: ${docId}`);
  
      // reset local ui state
      setSelectedDate("");
      setSelectedDateLocal("");
      setSelectedCourse(null);
      setSelectedTeeBox(null);
      setHoles([]);
      setOriginalHoles([]);
      setMatchSetups([{ matchLabel: "Match 1", type: "" }]);
      setEditingMatchId(null);
    } catch (err) {
      console.error("Error adding match day:", err);
    }
  };
  

   console.log("MatchPlanner - Teams State:", teams);


  return (
    <div className="admin-page-shell match-planner-page">
      <section className="admin-hero-card">
        <div className="admin-hero-copy">
          <p className="admin-eyebrow">Match Planner</p>
          <h2>Build your match day</h2>
          <p>Choose the date, course, tee box, and scoring formats for the round.</p>
        </div>
      </section>

      {existingMatches.length > 0 && (
  <section className="admin-section-card">
    <div className="admin-section-header">
      <div>
        <p className="admin-eyebrow">Saved Days</p>
        <h3>Existing Match Days</h3>
      </div>
    </div>
    <div className="tournament-card-grid">
    {existingMatches.map(match => (
      <article key={match.id} className="tournament-card">
        <h4>{match.date}</h4>
        <p className="tournament-card-subtitle">
          {match.course?.course_name || "N/A"} {match.teeBox?.tee_name ? `• ${match.teeBox.tee_name}` : ""}
        </p>
        <div className="tournament-card-actions">
        <button onClick={() => {
          setSelectedDate(match.date);
          setSelectedDateLocal(match.date);
          setEditingMatchId(match.id);
          setSelectedCourse(match.course);
          setSelectedTeeBox(match.teeBox);
          setHoles(match.teeBox?.holes || []);
          setOriginalHoles(match.teeBox?.holes || []);
          setMatchSetups(match.matches || []);
        }}>
          Edit This Match
        </button>
        <button className="admin-danger-button" onClick={() => deleteMatch(match.id)}>Delete</button>
        </div>

      </article>
    ))}
    </div>
  </section>
)}

      <section className="admin-section-card">
      <div className="setup-panel">
      <div className="match-planner-inline-field">
      <label htmlFor="match-date-input">Select Date:</label>
      <input
        id="match-date-input"
        type="date"
        value={selectedDateLocal}
        onChange={(e) => {
          const date = e.target.value;
          setSelectedDateLocal(date);  // local state for the input
          setSelectedDate(date);       // notify parent App.jsx
        }}
      />
      </div>

      <CourseSelector 
        setSelectedCourse={(course) => {
          console.log("Course selected:", course);
          setSelectedCourse(course);
          setSelectedTeeBox(null);
        }} 
      />

      <h3>Selected Course: {selectedCourse?.course_name || "No Course Selected"}</h3>

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
          <h3>Hole Information (Review & Edit Before Saving):</h3>
          {holes.length > 0 ? (
            <>
              <p style={{ marginBottom: "0.5rem" }}>
                If yardage, par, or handicap does not match the scorecard, update it below.
              </p>
              <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "650px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Hole</th>
                    <th style={{ textAlign: "left" }}>Yards</th>
                    <th style={{ textAlign: "left" }}>Par</th>
                    <th style={{ textAlign: "left" }}>HCP</th>
                  </tr>
                </thead>
                <tbody>
                  {holes.map((hole, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={hole.yardage ?? ""}
                          onChange={(e) => updateHoleField(index, "yardage", e.target.value)}
                          style={{ width: "90px" }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          value={hole.par ?? ""}
                          onChange={(e) => updateHoleField(index, "par", e.target.value)}
                          style={{ width: "60px" }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max="18"
                          value={hole.handicap ?? ""}
                          onChange={(e) => updateHoleField(index, "handicap", e.target.value)}
                          style={{ width: "60px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => setHoles([...originalHoles])}
                style={{ marginTop: "0.75rem" }}
              >
                Reset to API Values
              </button>
            </>
          ) : (
            <p>Loading hole data...</p>
          )}

        </div>
      )}
<h2>Match Setup</h2>
{matchSetups.map((match, index) => (
  <div
    key={index}
    style={{
      border: '1px solid #aaa',
      padding: '10px 12px 4px',
      marginBottom: '1rem',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "0.75rem" }}>
      <h3 style={{ margin: 0 }}>{match.matchLabel}</h3>
      <button
      style={{ color: "red", margin: 0 }}
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
    </div>

    <div className="match-setup-inline-field">
      <label>Match Type:</label>

      <select
        value={match.type}
        onChange={(e) => {
          const updated = [...matchSetups];
          updated[index].type = e.target.value;

          if (e.target.value === "individualMatch9") {
            updated[index].team0    ??= "";
            updated[index].team1    ??= "";
            updated[index].players  ??= { team0: [], team1: [] };
            updated[index].pairings ??= {};
          }

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
    </div>


    
    {match.type === "teamMatch18" && (
  <>
    {[0, 1].map((teamIndex) => (
      <div key={teamIndex}>
        <div className="match-setup-inline-field">
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
        </div>

        {/* Player checkboxes */}
        {teams.find(t => t.name === match.participants?.[`team${teamIndex + 1}`]?.teamName)?.players.map((p, pIndex) => (
          <label key={pIndex} className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", margin: "4px 0" }}>
          <input
            type="checkbox"
            style={{ width: "16px", margin: 0, flex: "0 0 auto" }}
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
          <span>{formatPlayerOptionLabel(p)}</span>
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
        <div className="match-setup-inline-field">
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
        </div>

        {/* Player checkboxes */}
        {teams.find(t => t.name === match.participants?.[`team${teamIndex}`]?.teamName)?.players.map((p, pIndex) => (
          <label key={pIndex} className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", margin: "4px 0" }}>
            <input
              type="checkbox"
              style={{ width: "16px", margin: 0, flex: "0 0 auto" }}
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
            <span>{formatPlayerOptionLabel(p)}</span>
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



{match.type === "individualMatch9" && (() => {
  const selectedTeamA = teams.find((t) => t.name === match.front9?.teamA);
  const selectedTeamB = teams.find((t) => t.name === match.front9?.teamB);
  const playersA = match.front9?.playersA || [];
  const playersB = match.front9?.playersB || [];
  const back9Players = getIndividualNineBackNinePlayers(playersA, playersB);
  const makePreviewPairs = (aPlayers = [], bPlayers = []) => aPlayers
    .map((playerA, playerIndex) => bPlayers[playerIndex] ? `${playerA} vs ${bPlayers[playerIndex]}` : null)
    .filter(Boolean);
  const front9PreviewPairs = makePreviewPairs(playersA, playersB);
  const back9PreviewPairs = makePreviewPairs(back9Players.playersA, back9Players.playersB);
  const hasValidIndividualNineSelection =
    (playersA.length === 2 && playersB.length === 2) ||
    (playersA.length === 1 && playersB.length === 2) ||
    (playersA.length === 2 && playersB.length === 1);

  const updateIndividual9Team = (side, teamName) => {
    const updated = [...matchSetups];
    updated[index].front9 ??= { playersA: [], playersB: [] };
    updated[index].front9[side === "A" ? "teamA" : "teamB"] = teamName;
    updated[index].front9[side === "A" ? "playersA" : "playersB"] = [];
    delete updated[index].back9;
    setMatchSetups(updated);
  };

  const toggleIndividual9Player = (side, playerName, checked) => {
    const updated = [...matchSetups];
    updated[index].front9 ??= { playersA: [], playersB: [] };
    const key = side === "A" ? "playersA" : "playersB";
    const selected = updated[index].front9[key] || [];

    updated[index].front9[key] = checked
      ? selected.length < 2
        ? [...selected, playerName]
        : selected
      : selected.filter((name) => name !== playerName);

    delete updated[index].back9;
    setMatchSetups(updated);
  };

  return (
    <div className="individual-nine-builder">
      <h4>Individual Match Play Pairings</h4>
      <p className="setup-help-text">
        Pick two teams, then choose either two players from each team or a 1-vs-2 group. The back nine matchups will switch automatically.
      </p>

      {["A", "B"].map((side) => {
        const teamKey = side === "A" ? "teamA" : "teamB";
        const selectedTeam = side === "A" ? selectedTeamA : selectedTeamB;
        const selectedPlayers = side === "A" ? playersA : playersB;

        return (
          <div key={side} className="individual-nine-team-picker">
            <div className="match-setup-inline-field">
              <label>{`Team ${side}:`}</label>
              <select
                value={match.front9?.[teamKey] || ""}
                onChange={(e) => updateIndividual9Team(side, e.target.value)}
              >
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTeam?.players?.map((p) => {
              const isChecked = selectedPlayers.includes(p.name);
              const isDisabled = !isChecked && selectedPlayers.length >= 2;

              return (
                <label key={p.name} className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", margin: "4px 0" }}>
                  <input
                    type="checkbox"
                    style={{ width: "16px", margin: 0, flex: "0 0 auto" }}
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={(e) => toggleIndividual9Player(side, p.name, e.target.checked)}
                  />
                  <span>{formatPlayerOptionLabel(p)}</span>
                </label>
              );
            })}
          </div>
        );
      })}

      {hasValidIndividualNineSelection && (
        <div className="individual-nine-preview">
          <strong>Generated matchups</strong>
          <span>Front 9: {front9PreviewPairs.join(" | ")}</span>
          <span>Back 9: {back9PreviewPairs.join(" | ")}</span>
        </div>
      )}
    </div>
  );
})()}






{match.type === "stroke" && (
  <div>
    <h4>Stroke Play Participants</h4>
    {teams.flatMap((team) =>
      team.players.map((player, idx) => {
        const isChecked = match.participants?.[player.name] ?? false;
        return (
          <div key={`${team.name}-${idx}`} style={{ marginLeft: "1px" }}>
            <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", margin: "4px 0" }}>
              <input
                type="checkbox"
                style={{ width: "16px", margin: 0, flex: "0 0 auto" }}
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
              <span>{formatPlayerOptionLabel(player)}</span>
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
          <label key={pIndex} className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", margin: "4px 0" }}>
            <input
              type="checkbox"
              style={{ width: "16px", margin: 0, flex: "0 0 auto" }}
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
            <span>{formatPlayerOptionLabel(player)}</span>
          </label>
        ))}
      </div>
    ))}
  </div>
)}

  <div style={{ marginTop: "1rem" }}>
    <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", margin: "0 auto" }}>
      <input
        type="checkbox"
        style={{ width: "16px", margin: 0, flex: "0 0 auto" }}
        checked={match.excludeFromIndividual || false}
        onChange={(e) => {
          const updated = [...matchSetups];
          updated[index].excludeFromIndividual = e.target.checked;
          setMatchSetups(updated);
        }}
      />
      Exclude this match from the individual leaderboard
    </label>
  </div>

  </div>
  
))}

{matchSetups.length < 20 && (
  <div style={{ display: "flex", justifyContent: "center" }}>
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
  </div>
)}


<div className="setup-actions">
  <button className="admin-secondary-button" onClick={goBack}>Back to Team Setup</button>
  <button className="admin-primary-button" onClick={addDayToFirebase}>
    {editingMatchId ? "Update Day" : "Add Day"}
  </button>
</div>

      </div>
      </section>
    </div>
  );
}

export default MatchPlanner;
