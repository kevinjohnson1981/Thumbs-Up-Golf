import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function IndividualLeaderboard({ selectedTournamentId, teams = [] }) {

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatToPar = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "";
    if (value === 0) return "E";
    return `${value > 0 ? "+" : ""}${value}`;
  };

  const getTextColor = (bgColor) => {
    if (!bgColor) return "#000000";

    const namedColors = {
      red: "#ff0000",
      blue: "#0000ff",
      green: "#008000",
      purple: "#800080",
      orange: "#ffa500",
      black: "#000000",
      yellow: "#ffff00",
      gold: "#ffd700",
      white: "#ffffff",
      gray: "#808080",
      grey: "#808080",
    };

    const normalized = namedColors[bgColor.toLowerCase()] || bgColor;
    const hex = normalized.replace("#", "");
    if (hex.length !== 6) return "#000000";

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 150 ? "#000000" : "#ffffff";
  };

  const teamColorMap = {};
  teams.forEach((team) => {
    if (team?.name) {
      teamColorMap[team.name] = team.color || "";
    }
  });

  useEffect(() => {
    if (!selectedTournamentId) return;

    const fetchLeaderboardData = async () => {
      // 1️⃣  pull every score-file once
      const scoreSnaps = await getDocs(
        collection(db, "tournaments", selectedTournamentId, "scores")
      );
  
      // 2️⃣  pull every “day” document once (each can contain several matches)
      const daySnaps = await getDocs(
        collection(db, "tournaments", selectedTournamentId, "matches")
      );
  
      const allScores = [];
  
      // 3️⃣  for each score-file, find the day & match that produced it
      for (const scoreDoc of scoreSnaps.docs) {
        const scoreData = scoreDoc.data();            // { scores:{…}, … }
        const scoreId   = scoreDoc.id;                // scores_2025-06-14_teamMatch9_Match_2
        let   dayDoc    = null;                       // full day document
        let   thisMatch = null;                       // the exact match object
  
        daySnaps.docs.forEach(d => {
          const day = d.data();
          (day.matches || []).forEach(m => {
            const lbl = (m.matchLabel || "Match").replace(/\s+/g, "_");
            const cid = `scores_${day.date}_${m.type}_${lbl}`;
            if (cid === scoreId) {
              dayDoc    = day;
              thisMatch = m;
            }
          });
        });
  
        if (!dayDoc || !thisMatch) continue;            // couldn’t match → skip
        if (thisMatch.excludeFromIndividual) continue;  // admin ticked the box
  
        // hole-par lookup for this tee-box
        const holePars       = dayDoc.teeBox?.holes?.map(h => h.par) || [];
        const totalParByHole = {};
        holePars.forEach((par, idx) => (totalParByHole[idx] = par));
  
        const [ , date ] = scoreId.split("_");          // 2nd token is the date
  
        allScores.push({
          date,
          scores: scoreData.scores,
          totalParByHole
        });
      }
  
      // 4️⃣  aggregate per player
      const playerTotals = {};
  
      allScores.forEach(({ scores, date, totalParByHole }) => {
        if (!scores) return;
  
        Object.entries(scores).forEach(([playerName, holeScores]) => {
          if (!playerTotals[playerName]) {
            const teamName = holeScores.teamName || null;
            playerTotals[playerName] = { name: playerName, team: teamName, days: {} };
          }
  
          let gross = 0,
              net   = 0,
              parPlayed = 0;
  
          Object.entries(holeScores).forEach(([hIdx, v]) => {
            if (typeof v !== "object") return;           // skip teamName entry
            const g = parseInt(v.gross);
            const n = parseInt(v.net);
            if (!isNaN(g)) gross += g;
            if (!isNaN(n)) net   += n;
  
            const hp = totalParByHole[hIdx];
            if (!isNaN(hp)) parPlayed += hp;
          });
  
          const netToPar = parPlayed > 0 ? net - parPlayed : null;
  
          playerTotals[playerName].days[date] = { gross, net, netToPar };
        });
      });
  
          // 5️⃣  format & sort  (REPLACE this block)
    const leaderboard = Object.values(playerTotals)
    .map(p => ({
      name: p.name,
      team: p.team,
      scoresByDay: p.days,           // 👈 keep the old key!
      totalToPar: Object.values(p.days).reduce((s, d) => s + d.netToPar, 0)
    }))
    .sort((a, b) => a.totalToPar - b.totalToPar);

  
      setLeaderboardData(leaderboard);
      setLoading(false);
    };
  
  
    fetchLeaderboardData();
  }, [selectedTournamentId]);
  

  const allDates = Array.from(
    new Set(
      leaderboardData.flatMap(p => Object.keys(p.scoresByDay))
    )
  ).sort();

  const dayLabels = allDates.map((date, idx) => ({
    date,
    label: `Day ${idx + 1}`
  }));

  if (loading) {
    return (
      <div className="admin-page-shell leaderboard-page-shell">
        <section className="admin-hero-card compact player-select-hero">
          <div className="admin-hero-copy">
            <h2>Individual Leaderboard</h2>
          </div>
        </section>

        <section className="admin-section-card leaderboard-section-card">
          <div className="admin-empty-state">
            <h4>Loading leaderboard...</h4>
            <p>Scores are being gathered for this event.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page-shell leaderboard-page-shell">
      <section className="admin-hero-card compact player-select-hero">
        <div className="admin-hero-copy">
          <h2>Individual Leaderboard</h2>
        </div>
      </section>

      <section className="admin-section-card leaderboard-section-card">
        {leaderboardData.length === 0 ? (
          <div className="admin-empty-state">
            <h4>No scores posted yet</h4>
            <p>Once players start entering scores, the leaderboard will appear here.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper leaderboard-table-wrapper">
              <table className="header-table leaderboard-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Player</th>
                    {dayLabels.map((day) => (
                      <th key={day.date}>{day.label}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((player, idx) => (
                    <tr
                      key={idx}
                      className={`leaderboard-row ${idx < 3 ? `leaderboard-row-top-${idx + 1}` : ""}`}
                      style={{
                        backgroundColor: teamColorMap[player.team] || "",
                        color: getTextColor(teamColorMap[player.team] || "")
                      }}
                    >
                      <td className="leaderboard-rank-cell">{idx + 1}</td>
                      <td>{player.name}</td>
                      {dayLabels.map((day) => {
                        const score = player.scoresByDay[day.date];
                        return (
                          <td key={day.date} className="leaderboard-day-cell">
                            {score
                              ? <span className="leaderboard-day-to-par">{formatToPar(score.netToPar)}</span>
                              : ""}
                          </td>
                        );
                      })}

                      <td className="leaderboard-total-cell">
                        {formatToPar(player.totalToPar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default IndividualLeaderboard;
