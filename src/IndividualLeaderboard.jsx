import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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

  const buildLeaderboardData = (scoreDocs = [], dayDocs = []) => {
    const allScores = [];

    for (const scoreDoc of scoreDocs) {
      const scoreData = scoreDoc.data();
      const scoreId = scoreDoc.id;
      let dayDoc = null;
      let thisMatch = null;

      dayDocs.forEach((daySnapshot) => {
        const day = daySnapshot.data();
        (day.matches || []).forEach((match) => {
          const label = (match.matchLabel || "Match").replace(/\s+/g, "_");
          const candidateId = `scores_${day.date}_${match.type}_${label}`;
          if (candidateId === scoreId) {
            dayDoc = day;
            thisMatch = match;
          }
        });
      });

      if (!dayDoc || !thisMatch) continue;
      if (thisMatch.excludeFromIndividual) continue;

      const holePars = dayDoc.teeBox?.holes?.map((hole) => hole.par) || [];
      const totalParByHole = {};
      holePars.forEach((par, index) => {
        totalParByHole[index] = par;
      });

      const [, date] = scoreId.split("_");

      allScores.push({
        date,
        scores: scoreData.scores,
        totalParByHole,
      });
    }

    const playerTotals = {};

    allScores.forEach(({ scores, date, totalParByHole }) => {
      if (!scores) return;

      Object.entries(scores).forEach(([playerName, holeScores]) => {
        if (!playerTotals[playerName]) {
          const teamName = holeScores.teamName || null;
          playerTotals[playerName] = { name: playerName, team: teamName, days: {} };
        }

        let gross = 0;
        let net = 0;
        let parPlayed = 0;

        Object.entries(holeScores).forEach(([holeIndex, value]) => {
          if (typeof value !== "object") return;
          const grossScore = parseInt(value.gross, 10);
          const netScore = parseInt(value.net, 10);
          if (!Number.isNaN(grossScore)) gross += grossScore;
          if (!Number.isNaN(netScore)) net += netScore;

          const par = totalParByHole[holeIndex];
          if (!Number.isNaN(par)) parPlayed += par;
        });

        const netToPar = parPlayed > 0 ? net - parPlayed : null;
        playerTotals[playerName].days[date] = { gross, net, netToPar };
      });
    });

    const leaderboard = Object.values(playerTotals)
      .map((player) => ({
        name: player.name,
        team: player.team,
        scoresByDay: player.days,
        totalToPar: Object.values(player.days).reduce((sum, day) => sum + day.netToPar, 0),
      }))
      .sort((a, b) => a.totalToPar - b.totalToPar);

    setLeaderboardData(leaderboard);
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedTournamentId) {
      setLeaderboardData([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    let scoreDocs = null;
    let dayDocs = null;

    const maybeRebuild = () => {
      if (!scoreDocs || !dayDocs) return;
      buildLeaderboardData(scoreDocs, dayDocs);
    };

    const unsubscribeScores = onSnapshot(
      collection(db, "tournaments", selectedTournamentId, "scores"),
      (snapshot) => {
        scoreDocs = snapshot.docs;
        maybeRebuild();
      },
      (error) => {
        console.error("Error listening to scores:", error);
        setLoading(false);
      }
    );

    const unsubscribeMatches = onSnapshot(
      collection(db, "tournaments", selectedTournamentId, "matches"),
      (snapshot) => {
        dayDocs = snapshot.docs;
        maybeRebuild();
      },
      (error) => {
        console.error("Error listening to matches:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeScores();
      unsubscribeMatches();
    };
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
