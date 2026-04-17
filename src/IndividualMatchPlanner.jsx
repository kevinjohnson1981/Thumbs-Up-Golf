import React, { useEffect, useMemo, useState } from "react";
import CourseSelector from "./GolfCourseSelector";
import { db } from "./firebase";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

function IndividualMatchPlanner({ goBack, players, tournamentId, setSelectedDate }) {
  const [selectedDateLocal, setSelectedDateLocal] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeeBox, setSelectedTeeBox] = useState(null);
  const [holes, setHoles] = useState([]);
  const [originalHoles, setOriginalHoles] = useState([]);
  const [existingMatches, setExistingMatches] = useState([]);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [matchSetups, setMatchSetups] = useState([{ matchLabel: "Match 1", type: "" }]);

  const playerOptions = useMemo(
    () =>
      (players || []).filter((player) => player?.name?.trim()).map((player) => ({
        ...player,
        name: player.name.trim(),
      })),
    [players]
  );

  useEffect(() => {
    const fetchExistingMatches = async () => {
      if (!tournamentId) return;

      try {
        const matchSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "matches"));
        const matches = matchSnapshot.docs
          .map((matchDoc) => ({
            id: matchDoc.id,
            ...matchDoc.data(),
          }))
          .filter((matchDay) => matchDay.eventFormat === "individual");

        setExistingMatches(matches);
      } catch (error) {
        console.error("Error fetching individual match days:", error);
      }
    };

    fetchExistingMatches();
  }, [tournamentId]);

  useEffect(() => {
    if (!selectedTeeBox) return;
    if (!selectedCourse || !selectedCourse.tees || typeof selectedCourse.tees !== "object") return;

    const teeDetails = Object.values(selectedCourse.tees)
      .flat()
      .find((tee) => tee.tee_name === selectedTeeBox.tee_name);

    if (!teeDetails?.holes) return;

    setHoles(teeDetails.holes);
    setOriginalHoles(teeDetails.holes);
  }, [selectedCourse, selectedTeeBox]);

  const formatPlayerOptionLabel = (player) => {
    const handicap = player?.handicap ?? "";
    return handicap === "" ? player.name : `${player.name} (${handicap})`;
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

  const deepClean = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(deepClean).filter((value) => value !== undefined);
    }

    if (obj !== null && typeof obj === "object") {
      const cleaned = {};
      Object.entries(obj).forEach(([key, value]) => {
        const cleanedValue = deepClean(value);
        if (cleanedValue !== undefined) cleaned[key] = cleanedValue;
      });
      return cleaned;
    }

    return obj;
  };

  const updateMatchSetup = (matchIndex, updater) => {
    setMatchSetups((prev) =>
      prev.map((match, index) =>
        index === matchIndex ? (typeof updater === "function" ? updater(match) : updater) : match
      )
    );
  };

  const getSelectedPlayers = (match) => {
    if (match.type === "stroke" || match.type === "stableford") {
      return match.participants || [];
    }

    if (match.type === "individualMatch18") {
      return (match.pairings || [])
        .flatMap((pair) => [pair.playerA, pair.playerB])
        .filter(Boolean);
    }

    if (match.type === "individualMatch9") {
      return [...(match.front9?.playersA || []), ...(match.front9?.playersB || [])];
    }

    return [];
  };

  const getBackNinePlayers = (playersA = [], playersB = []) => {
    if (playersA.length === 2 && playersB.length === 1) {
      return { playersA: [playersA[1]], playersB };
    }

    if (playersA.length === 1 && playersB.length === 2) {
      return { playersA, playersB: [playersB[1]] };
    }

    return { playersA, playersB: [...playersB].reverse() };
  };

  const buildNineHolePreview = (playersA = [], playersB = []) => {
    const pairs = [];
    const count = Math.min(playersA.length, playersB.length);
    for (let index = 0; index < count; index += 1) {
      if (playersA[index] && playersB[index]) {
        pairs.push(`${playersA[index]} vs ${playersB[index]}`);
      }
    }
    return pairs;
  };

  const deleteMatchDay = async (matchId) => {
    try {
      await deleteDoc(doc(db, "tournaments", tournamentId, "matches", matchId));
      setExistingMatches((prev) => prev.filter((match) => match.id !== matchId));
    } catch (error) {
      console.error("Error deleting individual match day:", error);
    }
  };

  const resetPlanner = () => {
    setSelectedDate("");
    setSelectedDateLocal("");
    setSelectedCourse(null);
    setSelectedTeeBox(null);
    setHoles([]);
    setOriginalHoles([]);
    setMatchSetups([{ matchLabel: "Match 1", type: "" }]);
    setEditingMatchId(null);
  };

  const addMatchDayToFirebase = async () => {
    if (!selectedDateLocal || !selectedCourse || !selectedTeeBox) {
      alert("Please select a date, course, tee box, and at least one match.");
      return;
    }

    if (playerOptions.length < 2) {
      alert("Please add at least two players before building an individual match day.");
      return;
    }

    for (const match of matchSetups) {
      if (!match.type) {
        alert(`${match.matchLabel}: please choose a match type.`);
        return;
      }

      if ((match.type === "stroke" || match.type === "stableford") && (match.participants || []).length < 2) {
        alert(`${match.matchLabel}: please choose at least two players.`);
        return;
      }

      if (match.type === "individualMatch18") {
        const validPairings = (match.pairings || []).filter((pair) => pair?.playerA && pair?.playerB);
        if (validPairings.length === 0) {
          alert(`${match.matchLabel}: please create at least one pairing.`);
          return;
        }
      }

      if (match.type === "individualMatch9") {
        const playersA = match.front9?.playersA || [];
        const playersB = match.front9?.playersB || [];
        const validNine =
          (playersA.length === 2 && playersB.length === 2) ||
          (playersA.length === 2 && playersB.length === 1) ||
          (playersA.length === 1 && playersB.length === 2) ||
          (playersA.length === 1 && playersB.length === 1);

        if (!validNine) {
          alert(`${match.matchLabel}: choose 1 or 2 players on each side.`);
          return;
        }
      }
    }

    const holesWithNumbers = holes.map((hole, index) => ({ ...hole, hole: index + 1 }));
    const docId = editingMatchId || `match_${selectedDateLocal}_${Date.now()}`;

    const transformedMatches = matchSetups.map((match) => {
      if (match.type === "stroke" || match.type === "stableford") {
        return {
          matchLabel: match.matchLabel,
          type: match.type,
          participants: match.participants || [],
        };
      }

      if (match.type === "individualMatch18") {
        const pairings = (match.pairings || []).filter((pair) => pair?.playerA && pair?.playerB);
        return {
          matchLabel: match.matchLabel,
          type: "individualMatch18",
          pairings,
          teamA: "Side A",
          teamB: "Side B",
        };
      }

      if (match.type === "individualMatch9") {
        const front9 = {
          playersA: match.front9?.playersA || [],
          playersB: match.front9?.playersB || [],
          teamA: "Side A",
          teamB: "Side B",
        };
        const backNinePlayers = getBackNinePlayers(front9.playersA, front9.playersB);
        const back9 = {
          playersA: backNinePlayers.playersA,
          playersB: backNinePlayers.playersB,
          teamA: "Side A",
          teamB: "Side B",
        };
        const makePairs = (playersA = [], playersB = []) =>
          playersA
            .map((playerA, index) => (playersB[index] ? { playerA, playerB: playersB[index] } : null))
            .filter(Boolean);

        return {
          matchLabel: match.matchLabel,
          type: "individualMatch9",
          front9,
          back9,
          pairings: {
            front9: makePairs(front9.playersA, front9.playersB),
            back9: makePairs(back9.playersA, back9.playersB),
          },
        };
      }

      return match;
    });

    const newDay = {
      eventFormat: "individual",
      tournamentId,
      date: selectedDateLocal,
      course: {
        id: selectedCourse.id,
        course_name: selectedCourse.course_name,
        location: selectedCourse.location,
      },
      teeBox: {
        tee_name: selectedTeeBox.tee_name,
        total_yards: selectedTeeBox.total_yards,
        holes: holesWithNumbers,
      },
      players: playerOptions,
      matches: transformedMatches,
    };

    try {
      await setDoc(doc(db, "tournaments", tournamentId, "matches", docId), deepClean(newDay));
      resetPlanner();

      const refreshedMatches = await getDocs(collection(db, "tournaments", tournamentId, "matches"));
      setExistingMatches(
        refreshedMatches.docs
          .map((matchDoc) => ({ id: matchDoc.id, ...matchDoc.data() }))
          .filter((matchDay) => matchDay.eventFormat === "individual")
      );
    } catch (error) {
      console.error("Error saving individual match day:", error);
    }
  };

  return (
    <div className="admin-page-shell match-planner-page">
      <section className="admin-hero-card">
        <div className="admin-hero-copy">
          <p className="admin-eyebrow">Individual Match Planner</p>
          <h2>Build your individual match day</h2>
          <p>Choose the date, course, tee box, and player matchups for this tournament day.</p>
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
            {existingMatches.map((matchDay) => (
              <article key={matchDay.id} className="tournament-card">
                <h4>{matchDay.date}</h4>
                <p className="tournament-card-subtitle">
                  {matchDay.course?.course_name || "N/A"}
                  {matchDay.teeBox?.tee_name ? ` • ${matchDay.teeBox.tee_name}` : ""}
                </p>
                <div className="tournament-card-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(matchDay.date);
                      setSelectedDateLocal(matchDay.date);
                      setEditingMatchId(matchDay.id);
                      setSelectedCourse(matchDay.course);
                      setSelectedTeeBox(matchDay.teeBox);
                      setHoles(matchDay.teeBox?.holes || []);
                      setOriginalHoles(matchDay.teeBox?.holes || []);
                      setMatchSetups(matchDay.matches || []);
                    }}
                  >
                    Edit This Match
                  </button>
                  <button type="button" className="admin-danger-button" onClick={() => deleteMatchDay(matchDay.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="admin-section-card">
        <div className="setup-panel">
          <div className="match-planner-inline-field">
            <label htmlFor="individual-match-date-input">Select Date:</label>
            <input
              id="individual-match-date-input"
              type="date"
              value={selectedDateLocal}
              onChange={(e) => {
                const date = e.target.value;
                setSelectedDateLocal(date);
                setSelectedDate(date);
              }}
            />
          </div>

          <CourseSelector
            setSelectedCourse={(course) => {
              setSelectedCourse(course);
              setSelectedTeeBox(null);
              setHoles([]);
              setOriginalHoles([]);
            }}
          />

          <h3>Selected Course: {selectedCourse?.course_name || "No Course Selected"}</h3>

          {selectedCourse && (
            <div>
              <h3>Select a Tee Box:</h3>
              <div className="selection-card-grid">
                {Object.values(selectedCourse.tees || {})
                  .flat()
                  .map((tee, index) => (
                    <button
                      key={`${tee.tee_name}-${index}`}
                      type="button"
                      className={`selection-card ${selectedTeeBox?.tee_name === tee.tee_name ? "active" : ""}`}
                      onClick={() => setSelectedTeeBox(tee)}
                    >
                      <strong>{tee.tee_name}</strong>
                      <span>{tee.total_yards} yards</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {selectedTeeBox && (
            <div className="individual-hole-editor">
              <h3>Hole Information (Review & Edit Before Saving)</h3>
              {holes.length > 0 ? (
                <>
                  <p className="setup-help-text">
                    If yardage, par, or handicap does not match the scorecard, update it below.
                  </p>
                  <table className="individual-hole-table">
                    <thead>
                      <tr>
                        <th>Hole</th>
                        <th>Yards</th>
                        <th>Par</th>
                        <th>HCP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holes.map((hole, index) => (
                        <tr key={`hole-${index + 1}`}>
                          <td>{index + 1}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={hole.yardage ?? ""}
                              onChange={(e) => updateHoleField(index, "yardage", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={hole.par ?? ""}
                              onChange={(e) => updateHoleField(index, "par", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max="18"
                              value={hole.handicap ?? ""}
                              onChange={(e) => updateHoleField(index, "handicap", e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" className="admin-secondary-button" onClick={() => setHoles([...originalHoles])}>
                    Reset to API Values
                  </button>
                </>
              ) : (
                <p>Loading hole data...</p>
              )}
            </div>
          )}

          <h2>Match Setup</h2>
          {matchSetups.map((match, index) => {
            const front9PlayersA = match.front9?.playersA || [];
            const front9PlayersB = match.front9?.playersB || [];
            const backNinePlayers = getBackNinePlayers(front9PlayersA, front9PlayersB);
            const front9Preview = buildNineHolePreview(front9PlayersA, front9PlayersB);
            const back9Preview = buildNineHolePreview(backNinePlayers.playersA, backNinePlayers.playersB);

            return (
              <div key={match.matchLabel} className="individual-match-card">
                <div className="individual-match-card-header">
                  <h3>{match.matchLabel}</h3>
                  {matchSetups.length > 1 && (
                    <button
                      type="button"
                      className="admin-danger-button"
                      onClick={() =>
                        setMatchSetups((prev) =>
                          prev
                            .filter((_, matchIndex) => matchIndex !== index)
                            .map((existingMatch, matchIndex) => ({
                              ...existingMatch,
                              matchLabel: `Match ${matchIndex + 1}`,
                            }))
                        )
                      }
                    >
                      Remove Match
                    </button>
                  )}
                </div>

                <div className="match-setup-inline-field">
                  <label>Match Type:</label>
                  <select
                    value={match.type}
                    onChange={(e) =>
                      updateMatchSetup(index, (current) => ({
                        matchLabel: current.matchLabel,
                        type: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select a match type</option>
                    <option value="stroke">Regular Stroke Play</option>
                    <option value="stableford">Stableford</option>
                    <option value="individualMatch18">Individual Match Play (18 holes)</option>
                    <option value="individualMatch9">Individual Match Play (Front/Back 9)</option>
                  </select>
                </div>

                {(match.type === "stroke" || match.type === "stableford") && (
                  <div className="individual-participant-block">
                    <p className="setup-help-text">Choose the players who are competing in this round.</p>
                    {playerOptions.map((player) => {
                      const selectedPlayers = match.participants || [];
                      const checked = selectedPlayers.includes(player.name);
                      return (
                        <label key={`${match.matchLabel}-${player.name}`} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              updateMatchSetup(index, (current) => {
                                const selected = current.participants || [];
                                return {
                                  ...current,
                                  participants: e.target.checked
                                    ? [...selected, player.name]
                                    : selected.filter((name) => name !== player.name),
                                };
                              })
                            }
                          />
                          <span>{formatPlayerOptionLabel(player)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {match.type === "individualMatch18" && (
                  <div className="individual-pairings-block">
                    <p className="setup-help-text">Build one or more head-to-head pairings for the full 18 holes.</p>
                    {(match.pairings || [{ playerA: "", playerB: "" }]).map((pairing, pairingIndex) => (
                      <div key={`${match.matchLabel}-pair-${pairingIndex}`} className="individual-pairing-row">
                        <div className="match-setup-inline-field">
                          <label>Player A:</label>
                          <select
                            value={pairing.playerA || ""}
                            onChange={(e) =>
                              updateMatchSetup(index, (current) => {
                                const pairings = [...(current.pairings || [{ playerA: "", playerB: "" }])];
                                pairings[pairingIndex] = { ...pairings[pairingIndex], playerA: e.target.value };
                                return { ...current, pairings };
                              })
                            }
                          >
                            <option value="">Select player...</option>
                            {playerOptions.map((player) => (
                              <option key={`a-${player.name}`} value={player.name}>
                                {formatPlayerOptionLabel(player)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="match-setup-inline-field">
                          <label>Player B:</label>
                          <select
                            value={pairing.playerB || ""}
                            onChange={(e) =>
                              updateMatchSetup(index, (current) => {
                                const pairings = [...(current.pairings || [{ playerA: "", playerB: "" }])];
                                pairings[pairingIndex] = { ...pairings[pairingIndex], playerB: e.target.value };
                                return { ...current, pairings };
                              })
                            }
                          >
                            <option value="">Select player...</option>
                            {playerOptions.map((player) => (
                              <option key={`b-${player.name}`} value={player.name}>
                                {formatPlayerOptionLabel(player)}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(match.pairings || []).length > 1 && (
                          <button
                            type="button"
                            className="admin-danger-button"
                            onClick={() =>
                              updateMatchSetup(index, (current) => ({
                                ...current,
                                pairings: (current.pairings || []).filter((_, currentPairingIndex) => currentPairingIndex !== pairingIndex),
                              }))
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() =>
                        updateMatchSetup(index, (current) => ({
                          ...current,
                          pairings: [...(current.pairings || [{ playerA: "", playerB: "" }]), { playerA: "", playerB: "" }],
                        }))
                      }
                    >
                      Add Pairing
                    </button>
                  </div>
                )}

                {match.type === "individualMatch9" && (
                  <div className="individual-nine-builder">
                    <h4>Front / Back 9 Rotation</h4>
                    <p className="setup-help-text">
                      Choose 1 or 2 players on each side. The back nine will switch opponents automatically.
                    </p>

                    {["A", "B"].map((side) => {
                      const key = side === "A" ? "playersA" : "playersB";
                      const selectedPlayers = side === "A" ? front9PlayersA : front9PlayersB;

                      return (
                        <div key={`${match.matchLabel}-${side}`} className="individual-nine-team-picker">
                          <h4>{`Side ${side}`}</h4>
                          {playerOptions.map((player) => {
                            const checked = selectedPlayers.includes(player.name);
                            const disabled = !checked && selectedPlayers.length >= 2;
                            return (
                              <label key={`${side}-${player.name}`} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(e) =>
                                    updateMatchSetup(index, (current) => {
                                      const currentFront9 = current.front9 || { playersA: [], playersB: [] };
                                      const currentSidePlayers = currentFront9[key] || [];
                                      return {
                                        ...current,
                                        front9: {
                                          ...currentFront9,
                                          [key]: e.target.checked
                                            ? [...currentSidePlayers, player.name]
                                            : currentSidePlayers.filter((name) => name !== player.name),
                                        },
                                      };
                                    })
                                  }
                                />
                                <span>{formatPlayerOptionLabel(player)}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}

                    {(front9Preview.length > 0 || back9Preview.length > 0) && (
                      <div className="individual-nine-preview">
                        <strong>Preview</strong>
                        {front9Preview.length > 0 && <span>Front 9: {front9Preview.join(" • ")}</span>}
                        {back9Preview.length > 0 && <span>Back 9: {back9Preview.join(" • ")}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="player-setup-add-row">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() =>
                setMatchSetups((prev) => [
                  ...prev,
                  {
                    matchLabel: `Match ${prev.length + 1}`,
                    type: "",
                  },
                ])
              }
            >
              Add Match
            </button>
          </div>

          <div className="setup-actions">
            <button type="button" className="admin-secondary-button" onClick={goBack}>
              Back to Player Setup
            </button>
            <button type="button" className="admin-primary-button" onClick={addMatchDayToFirebase}>
              {editingMatchId ? "Update Match Day" : "Add Day"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default IndividualMatchPlanner;
