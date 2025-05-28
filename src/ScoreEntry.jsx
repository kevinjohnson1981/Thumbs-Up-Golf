import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { useRef } from "react";


console.log("🔥 ScoreEntry is being rendered");

function ScoreEntry({ selectedDate, tournamentId, matchType, players, selectedMatch, setScoresInApp, setTeamPointsInApp, teamPoints }) {

  const [matchData, setMatchData] = useState(null);
  const [localPlayers, setLocalPlayers] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState({ team1: [], team2: [] });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const holes = matchData?.teeBox?.holes || [];
  const [holeImages, setHoleImages] = useState({});
  const [selectedHoleImage, setSelectedHoleImage] = useState(null);
  const getMatchPairings = () => {
    if (matchType !== "individualMatch9" || !selectedMatch?.pairings) return null;
  
    const front9 = selectedMatch.pairings.front9 || [];
    const back9 = selectedMatch.pairings.back9 || [];
  
    return { front9, back9 };
  };
  const [visibleHalf, setVisibleHalf] = useState("front");
  const [scorecardTab, setScorecardTab] = useState("front9"); // or "back9"

  const getTeamColor = (teamName) => {
    const team = teams.find(t => t.name === teamName);
    return team?.color || "#ccc"; // default fallback color
  };
  
  const getContrastTextColor = (bgColor) => {
    if (!bgColor) return "#000";
  
    // Expanded named color fallback mapping
    const namedColors = {
      red: "#ff0000",
      blue: "#0000ff",
      green: "#008000",
      purple: "#800080",
      orange: "#ffa500",
      black: "#000000",
      yellow: "#ffff00"
    };
  
    const color = namedColors[bgColor.toLowerCase()] || bgColor;
  
    // Ensure valid hex
    const hex = color.replace("#", "");
    if (hex.length !== 6) return "#000"; // fallback to black
  
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
  
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
    return brightness > 140 ? "#000000" : "#ffffff";
  };
  
  const getMatchPlayHoleWinner = (holeIndex) => {
    if (!teamPlayers.team1 || !teamPlayers.team2) return null;
  
    const team1Best = getTeamBestBallScore(teamPlayers.team1, holeIndex);
    const team2Best = getTeamBestBallScore(teamPlayers.team2, holeIndex);
  
    if (team1Best == null || team2Best == null) return null;
    if (team1Best < team2Best) return "team1";
    if (team2Best < team1Best) return "team2";
    return "tie";
  };

  const getTeamRowHighlight = (winner) => {
    if (!winner || winner === "tie") return "";
  
    const winningTeam = winner === "team1" ? teamPlayers.team1[0] : teamPlayers.team2[0];
    const team = matchData.teams.find(t => t.players.some(p => p.name === winningTeam));
    return team ? team.color : "";
  };
  



  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const matchQuery = query(
          collection(db, "tournaments", tournamentId, "matches"),
          where("date", "==", selectedDate)
        );
        const snapshot = await getDocs(matchQuery);
  
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
  
          if (!selectedMatch) {
            console.warn("❌ No match found for type:", matchType);
          }
  
          setMatchData(docData); // keep full course and teeBox info
          // setSelectedMatch(selectedMatch); // store the specific match
        } else {
          console.warn("No match document found for date:", selectedDate);
        }
      } catch (error) {
        console.error("Error loading match data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchMatchData();
  }, [tournamentId, selectedDate, matchType]);
  
  useEffect(() => {
    if (!selectedMatch || !matchData) return;
    console.log("💡 MatchType:", matchType);
    console.log("🎯 SelectedMatch:", selectedMatch);
    console.log("📦 MatchData.teams:", matchData?.teams);

  
    if (matchType === "teamMatch18") {
      const team1 = selectedMatch.participants?.team1;
      const team2 = selectedMatch.participants?.team2;
    
      if (!team1 || !team2) {
        console.warn("⚠️ One or both teams missing in match participants.");
        return;
      }
    
      const allPlayers = [...team1.players, ...team2.players].map((playerName) => {
        const teamName =
          team1.players.includes(playerName) ? team1.teamName : team2.teamName;
        const teamObj = matchData.teams.find((t) => t.name === teamName);
        const playerObj = teamObj?.players.find((p) => p.name === playerName);
    
        return {
          name: playerName,
          handicap: parseInt(playerObj?.handicap || 0),
          teamName: teamName,
          teamColor: teamObj?.color || "gray"  // 👈 grab the color from the team
        };
      });
    
      setLocalPlayers(allPlayers);
      setTeamPlayers({
        team1: team1.players,
        team2: team2.players
      });
    }
    
    if (matchType === "individualMatch9") {
      const front9 = selectedMatch.pairings?.front9 || [];
      const back9 = selectedMatch.pairings?.back9 || [];
    
      const orderedFront = front9.flatMap(pair => [pair.playerA, pair.playerB]);
      const orderedBack = back9.flatMap(pair => [pair.playerA, pair.playerB]);
    
      // Use the appropriate order based on the current scorecard tab
      const orderedPlayers = scorecardTab === "front9" ? orderedFront : orderedBack;
    
      const allPlayers = orderedPlayers.map((name) => {
        const teamObj = matchData.teams.find((t) =>
          t.players.some((p) => p.name === name)
        );
        const playerObj = teamObj?.players.find((p) => p.name === name);
    
        return {
          name,
          handicap: parseInt(playerObj?.handicap || 0),
          teamName: teamObj?.name || "",
          teamColor: teamObj?.color || "gray"  // 👈 grab the color from the team
        };
      });
    
      setLocalPlayers(allPlayers);
    }

    if (matchType === "teamMatch9") {
      const team0 = selectedMatch.participants?.team0;
      const team1 = selectedMatch.participants?.team1;
    
      if (!team0 || !team1) {
        console.warn("⚠️ One or both teams missing in teamMatch9 participants.");
        return;
      }
    
      const allPlayers = [...(team0.players || []), ...(team1.players || [])].map((playerName) => {
        const teamName = team0.players.includes(playerName) ? team0.teamName : team1.teamName;
        const teamObj = matchData.teams.find((t) => t.name === teamName);
        const playerObj = teamObj?.players.find((p) => p.name === playerName);
    
        return {
          name: playerName,
          handicap: parseInt(playerObj?.handicap || 0),
          teamName: teamName,
          teamColor: teamObj?.color || "gray"
        };
      });
    
      setLocalPlayers(allPlayers);
      setTeamPlayers({
        team1: team0.players,
        team2: team1.players
      });
    }
    
    
    
  
    if (matchType === "stableford") {
      let participantNames = [];
    
      // ✅ Check if participants is an array of names (correct case)
      if (Array.isArray(selectedMatch.participants)) {
        participantNames = selectedMatch.participants;
      }
    
      // ✅ Check if it's a map like { A: true, B: true }
      else if (selectedMatch.participants && typeof selectedMatch.participants === 'object') {
        participantNames = Object.keys(selectedMatch.participants);
      }
    
      const allPlayers = participantNames.map((name) => {
        const teamObj = matchData.teams.find((t) =>
          t.players.some((p) => p.name === name)
        );
        const playerObj = teamObj?.players.find((p) => p.name === name);
    
        return {
          name,
          handicap: playerObj?.handicap || 0,
          teamName: teamObj?.name || "",
          teamColor: teamObj?.color || "gray"  // 👈 grab the color from the team
        };
      });
    
      setLocalPlayers(allPlayers);
    }
    
    
  
    if (matchType === "strokePlay" || matchType === "stroke") {
      const entries = selectedMatch.players || Object.keys(selectedMatch.participants || {});
    
      const allPlayers = entries.map((entry) => {
        const playerName = typeof entry === "string" ? entry : entry.name;
        const teamObj = matchData.teams.find((t) =>
          t.players.some((p) => p.name === playerName)
        );
        const playerObj = teamObj?.players.find((p) => p.name === playerName);
        return {
          name: playerName,
          handicap: parseInt(playerObj?.handicap || 0),
          teamName: teamObj?.name || "",
          teamColor: teamObj?.color || "gray"  // 👈 grab the color from the team
        };
      });
    
      setLocalPlayers(allPlayers);
    }

    if (matchType === "individualMatch18") {
      const pairings = selectedMatch.pairings || [];
    
      const orderedPlayers = pairings.flatMap(pair => [pair.playerA, pair.playerB]);
    
      const allPlayers = orderedPlayers.map((name) => {
        const teamObj = matchData.teams.find((t) =>
          t.players.some((p) => p.name === name)
        );
        const playerObj = teamObj?.players.find((p) => p.name === name);
    
        return {
          name,
          handicap: parseInt(playerObj?.handicap || 0),
          teamName: teamObj?.name || "",
          teamColor: teamObj?.color || "gray"
        };
      });
    
      setLocalPlayers(allPlayers);
    }
    
    
    
  }, [selectedMatch, matchData, matchType]);
  

  useEffect(() => {
    const fetchSavedScores = async () => {
      try {
        const scoreDocRef = doc(db, "tournaments", tournamentId, "scores", `scores_${selectedDate}_${matchType}_${selectedMatch.matchLabel?.replace(/\s+/g, "_") || "Match"}`
        );
        const scoreSnap = await getDoc(scoreDocRef);

        if (scoreSnap.exists()) {
          const savedData = scoreSnap.data();
          if (savedData.scores) {
            setScores(savedData.scores);
          }
        }
      } catch (error) {
        console.error("Failed to load saved scores:", error);
      }
    };

    if (selectedDate && matchType) {
      fetchSavedScores();
    }
  }, [selectedDate, matchType]);

  useEffect(() => {
    if (setScoresInApp) {
      setScoresInApp(scores);
    }
  }, [scores]);

  useEffect(() => {
    if (Object.keys(scores).length === 0) return;
  
    const timeout = setTimeout(() => {
      saveScoresToFirebase(); // Debounced save
    }, 1000); // 1 second after last change
  
    return () => clearTimeout(timeout); // cleanup
  }, [scores]);
  
  

  useEffect(() => {
    if (
      setTeamPointsInApp &&
      (matchType === "teamMatch18") &&
      matchData &&
      teamPlayers.team1.length > 0 &&
      teamPlayers.team2.length > 0
    ) {
      const front9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()]);
      const back9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()].map(i => i + 9));

      
      const teamNames = [
        selectedMatch?.participants?.team1?.teamName || "Team A",
        selectedMatch?.participants?.team2?.teamName || "Team B"
      ];
        
      

      const teamPoints = {
        [teamNames[0]]: {
          front9: front9?.team1 ?? "-",
          back9: back9?.team1 ?? "-",
        },
        [teamNames[1]]: {
          front9: front9?.team2 ?? "-",
          back9: back9?.team2 ?? "-",
        }
      };

      setTeamPointsInApp(teamPoints);
    }
  }, [scores, matchType, matchData, teamPlayers]);

  useEffect(() => {
    if (matchType === "stableford" && matchData && players.length > 0) {
      const teamTotals = {};
    
      localPlayers.forEach((playerObj) => {
        const totalPoints = getStablefordPoints(playerObj.name, parseInt(playerObj.handicap));
    
        // 🔢 Convert individual player points into tiered team points
        let teamPoints = 0;
        if (totalPoints >= 18.5) teamPoints = 3;
        else if (totalPoints >= 15.5) teamPoints = 2.5;
        else if (totalPoints >= 12.5) teamPoints = 2;
        else if (totalPoints >= 9.5) teamPoints = 1.5;
        else if (totalPoints >= 6.5) teamPoints = 1;
        else if (totalPoints >= 0.5) teamPoints = 0.5;
    
        if (!teamTotals[playerObj.teamName]) {
          teamTotals[playerObj.teamName] = { total: 0 };
        }
    
        teamTotals[playerObj.teamName].total += teamPoints;
      });
    
      console.log("🔥 Stableford teamPoints (tiered):", teamTotals);
      if (typeof setTeamPointsInApp === "function") {
        setTeamPointsInApp(teamTotals);
      }
      
    
  }}, [scores, matchData, players, matchType]);

  useEffect(() => {
    if (!selectedMatch || !matchData || matchType !== "individualMatch9") return;
  
    const front9 = selectedMatch.pairings?.front9 || [];
    const back9 = selectedMatch.pairings?.back9 || [];
  
    const orderedPlayers = scorecardTab === "front9"
      ? front9.flatMap(pair => [pair.playerA, pair.playerB])
      : back9.flatMap(pair => [pair.playerA, pair.playerB]);
  
    const allPlayers = orderedPlayers.map((name) => {
      const teamObj = matchData.teams.find((t) =>
        t.players.some((p) => p.name === name)
      );
      const playerObj = teamObj?.players.find((p) => p.name === name);
  
      return {
        name,
        handicap: parseInt(playerObj?.handicap || 0),
        teamName: teamObj?.name || "",
        teamColor: teamObj?.color || "gray"  // 👈 grab the color from the team
      };
    });
  
    setLocalPlayers(allPlayers);
  }, [scorecardTab, selectedMatch, matchData]);
  
  

  const scorecardRef = useRef(null);
  
  const updateScore = (playerName, holeIndex, grossScore) => {
    const gross = parseInt(grossScore);
    if (isNaN(gross)) return;
  
    const player = localPlayers.find(p => p.name === playerName);
    const handicap = parseInt(player?.handicap || 0);
    const holeHcp = holes[holeIndex]?.handicap || 0;
  
    let strokes = 0;
    if (handicap >= holeHcp) strokes = 1;
    if (handicap >= holeHcp + 18) strokes = 2;
  
    const net = gross - strokes;
    console.log("⛳️ updateScore:", playerName, holeIndex, grossScore);
    console.log("🧪 Saving score for:", playerName, "→ Hole:", holeIndex, "→ Gross:", grossScore);


    setScores((prev) => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [holeIndex]: {
          gross,
          net
        }
      }
    }));
  };
  

  if (loading) return <p>Loading match...</p>;
  if (!matchData) return <p>No match data found.</p>;
  if (!localPlayers || localPlayers.length === 0) {
    console.log("⚠️ No players found:", localPlayers);
    return <p>No players available for this match.</p>;
  }
  

  

  const getGrossTotal = (playerName) => {
    const playerScores = scores[playerName] || {};
    return holes.reduce((total, _, i) => {
      const scoreObj = playerScores[i];
      return total + (parseInt(scoreObj?.gross) || 0);
    }, 0);
  };
  

  const getNetTotal = (playerName) => {
    const playerScores = scores[playerName] || {};
    return holes.reduce((total, _, i) => {
      const scoreObj = playerScores[i];
      return total + (parseInt(scoreObj?.net) || 0);
    }, 0);
  };
  

  const getStablefordPoints = (playerName) => {
    if (matchType !== "stableford") return null;
  
    const playerScores = scores[playerName] || {};
    return holes.reduce((points, hole, i) => {
      const net = playerScores[i]?.net;
      if (net == null || isNaN(net)) return points;
  
      const diff = net - hole.par;
  
      if (diff >= 2) return points - 1;
      if (diff === 1) return points + 0;
      if (diff === 0) return points + 0.5;
      if (diff === -1) return points + 1;
      if (diff === -2) return points + 2;
      if (diff === -3) return points + 3;
      if (diff <= -4) return points + 4;
  
      return points;
    }, 0);
  };
  

  const getNetScore = (playerName, holeIndex) => {
    const net = scores[playerName]?.[holeIndex]?.net;
    return isNaN(net) ? null : net;
  };
  

  const getTeamBestBallScore = (playerNames, holeIndex) => {
    const netScores = playerNames.map(name => getNetScore(name, holeIndex)).filter(score => score !== null);
    return netScores.length ? Math.min(...netScores) : null;
  };

  const getIndividualMatchScore = (pairings, holesRange) => {
    const results = [];
  
    for (let pair of pairings) {
      let playerA = pair.playerA;
      let playerB = pair.playerB;
  
      let aWins = 0;
      let bWins = 0;
  
      for (let i of holesRange) {
        const a = scores[playerA]?.[i]?.net;
        const b = scores[playerB]?.[i]?.net;
        if (a == null || b == null) continue;
  
        if (a < b) aWins++;
        else if (b < a) bWins++;
      }
  
      let pointsA = 0.5;
      let pointsB = 0.5;
  
      if (aWins > bWins) {
        pointsA = 1;
        pointsB = 0;
      } else if (bWins > aWins) {
        pointsA = 0;
        pointsB = 1;
      }
  
      results.push({
        playerA,
        playerB,
        pointsA,
        pointsB
      });
    }
  
    return results;
  };
  
  

  const getTeamScore = (team1, team2, holesRange) => {
    let team1Total = 0;
    let team2Total = 0;
    let holesPlayed = 0;

    for (let i of holesRange) {
      const team1Best = getTeamBestBallScore(team1, i);
      const team2Best = getTeamBestBallScore(team2, i);

      if (team1Best !== null && team2Best !== null) {
        holesPlayed++;
        if (team1Best < team2Best) team1Total++;
        else if (team2Best < team1Best) team2Total++;
      }
    }

    if (holesPlayed === 0) return null;
    if (team1Total > team2Total) return { team1: 1, team2: 0 };
    if (team2Total > team1Total) return { team1: 0, team2: 1 };
    return { team1: 0.5, team2: 0.5 };
  };

  const getTeamNameFromMatchData = (playerName) => {
    const team = matchData?.teams?.find((t) =>
      t.players.some((p) => p.name === playerName)
    );
    return team?.name || null;
  };
  

  const saveScoresToFirebase = async () => {
    try {
      const label = selectedMatch?.matchLabel?.replace(/\s+/g, "_") || "Match";
      const scoresRef = doc(db, "tournaments", tournamentId, "scores", `scores_${selectedDate}_${matchType}_${label}`);

      let teamPoints = null;

      if (matchType === "teamMatch18") {
        const front9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()]);
        const back9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()].map(i => i + 9));
        const full18 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(18).keys()]);
      
        const teamNames = [
          selectedMatch?.participants?.team1?.teamName,
          selectedMatch?.participants?.team2?.teamName
        ];
      
        teamPoints = {
          [teamNames[0]]: {
            front9: front9?.team1 ?? "-",
            back9: back9?.team1 ?? "-",
            total: full18?.team1 ?? "-"
          },
          [teamNames[1]]: {
            front9: front9?.team2 ?? "-",
            back9: back9?.team2 ?? "-",
            total: full18?.team2 ?? "-"
          }
        };
      }
      
      

      if (matchType === "stableford") {
        teamPoints = {};
      
        players.forEach((player) => {
          const totalPoints = getStablefordPoints(player.name, parseInt(player.handicap));
      
          // Tiered scoring logic
          let teamScore = 0;
          if (totalPoints >= 18.5) teamScore = 3;
          else if (totalPoints >= 15.5) teamScore = 2.5;
          else if (totalPoints >= 12.5) teamScore = 2;
          else if (totalPoints >= 9.5) teamScore = 1.5;
          else if (totalPoints >= 6.5) teamScore = 1;
          else if (totalPoints >= 0.5) teamScore = 0.5;
      
          // ✅ Fallback to matchData if player.teamName is missing
          const teamName = player.teamName || getTeamNameFromMatchData(player.name);
          if (!teamPoints[teamName]) {
            teamPoints[teamName] = { total: 0 };
          }
      
          teamPoints[teamName].total += teamScore;
        });
      }
      
      

      if (matchType === "teamMatch9") {
        const holesToCheck = visibleHalf === "front"
          ? [...Array(9).keys()]
          : [...Array(9).keys()].map(i => i + 9);
      
        const result = getTeamScore(teamPlayers.team1, teamPlayers.team2, holesToCheck);
      
        const teamNames = [
          matchData.teams.find(team =>
            team.players.some(p => p.name === teamPlayers.team1[0])
          )?.name || "Team A",
          matchData.teams.find(team =>
            team.players.some(p => p.name === teamPlayers.team2[0])
          )?.name || "Team B",
        ];
      
        teamPoints = {
          [teamNames[0]]: {
            total: result?.team1 ?? "-"
          },
          [teamNames[1]]: {
            total: result?.team2 ?? "-"
          }
        };
      }

      if (matchType === "teamMatchFront9" || matchType === "teamMatchBack9") {
        const holesToCheck =
          matchType === "teamMatchFront9"
            ? [...Array(9).keys()]
            : [...Array(9).keys()].map(i => i + 9);
      
        const result = getTeamScore(teamPlayers.team1, teamPlayers.team2, holesToCheck);
      
        const teamNames = [
          matchData.teams.find(team =>
            team.players.some(p => p.name === teamPlayers.team1[0])
          )?.name || "Team A",
          matchData.teams.find(team =>
            team.players.some(p => p.name === teamPlayers.team2[0])
          )?.name || "Team B",
        ];
      
        teamPoints = {
          [teamNames[0]]: {
            total: result?.team1 ?? "-"
          },
          [teamNames[1]]: {
            total: result?.team2 ?? "-"
          }
        };
      }
      
      
      if (matchType === "individualMatch9") {}
        else if (matchType === "individualMatch9") {
        const pairings = Object.values(selectedMatch?.pairings?.[visibleHalf]) || [];
        const holesToCheck = visibleHalf === "front" ? [...Array(9).keys()] : [...Array(9).keys()].map(i => i + 9);
        const matchResults = getIndividualMatchScore(pairings, holesToCheck);
      
        const resultObj = {};
      
        pairings.forEach((pair, i) => {
          const label = `${pair.playerA} vs ${pair.playerB}`;
          resultObj[label] = {
            pointsA: matchResults[i]?.pointsA ?? 0,
            pointsB: matchResults[i]?.pointsB ?? 0,
          };
        });
      
        teamPoints = resultObj;
      }

      if (matchType === "individualMatch18") {
        const pairings = selectedMatch?.pairings || [];
        const holesToCheck = [...Array(18).keys()];
        const matchResults = getIndividualMatchScore(pairings, holesToCheck);
      
        const resultObj = {};
      
        pairings.forEach((pair, i) => {
          const label = `${pair.playerA} vs ${pair.playerB}`;
          resultObj[label] = {
            pointsA: matchResults[i]?.pointsA ?? 0,
            pointsB: matchResults[i]?.pointsB ?? 0,
          };
        });
      
        teamPoints = resultObj;
      }
      
      
      

      console.log("Saving to Firebase:", {
        scores,
        teamPoints
      });

      const scoresWithTeamNames = {};

      localPlayers.forEach(player => {
        const name = player.name;
        if (!scores[name]) return;
        scoresWithTeamNames[name] = {
          ...scores[name],
          teamName: player?.teamName || getTeamNameFromMatchData(name)
        };        
      });

      await setDoc(scoresRef, {
        scores: scoresWithTeamNames,
        ...(teamPoints && { teamPoints })
      }, { merge: true });


      
    } catch (error) {
      console.error("Error saving scores:", error);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
  
    const wsData = [
      ["Hole", "Yards", "Par", "HCP", ...localPlayers.map(p => p.name)],
    ];
  
    holes.forEach((hole, idx) => {
      const row = [
        idx + 1,
        hole.yardage,
        hole.par,
        hole.handicap,
        ...localPlayers.map(p => {
          const gross = scores[p.name]?.[idx]?.gross ?? "";
          const net = scores[p.name]?.[idx]?.net ?? "";
          return `${gross}${net !== "" ? ` (${net})` : ""}`;
        })
      ];
      wsData.push(row);
    });
  
    // Add total scores row
    const totalRow = [
      "Total",
      "", "", "",
      ...localPlayers.map(p =>
        `${getGrossTotal(p.name)} / ${getNetTotal(p.name, parseInt(p.handicap))}`
      )
    ];
    wsData.push([]);
    wsData.push(totalRow);
  
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Scorecard");
  
    XLSX.writeFile(wb, `scorecard_${selectedDate}_${matchType}.xlsx`);
  };

  const exportScorecardAsImage = async () => {
    const scorecard = scorecardRef.current;
    if (!scorecard) return;
  
    const scrollableBody = scorecard.querySelector(".scrollable-body");
    if (!scrollableBody) return;
  
    // Save original styles
    const originalScrollOverflow = scrollableBody.style.overflow;
    const originalScrollMaxHeight = scrollableBody.style.maxHeight;
  
    // Expand scrollable content
    scrollableBody.style.overflow = "visible";
    scrollableBody.style.maxHeight = "none";
  
    try {
      const canvas = await html2canvas(scorecard, {
        scale: 2,
        useCORS: true,
        windowWidth: scorecard.scrollWidth
      });
  
      const link = document.createElement("a");
      link.download = `scorecard_${selectedDate}_${matchType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to export image:", error);
    } finally {
      // Restore original scroll
      scrollableBody.style.overflow = originalScrollOverflow;
      scrollableBody.style.maxHeight = originalScrollMaxHeight;
    }
  };

  const bestBallStatusBlock = (() => {
    if (!(matchType === "bestBall1" || matchType === "bestBall2") || !matchData?.bestBallMatches) return null;

    const matchIndex = matchType === "bestBall1" ? 0 : 1;
    const matchTeams = matchData.bestBallMatches[matchIndex]?.matchTeams;
    if (!matchTeams || matchTeams.length < 2) return null;

    const teamNames = [matchTeams[0].teamName, matchTeams[1].teamName];
    const front9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()]);
    const back9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()].map(i => i + 9));

    return (
      <div className="match-status">
        <h4>
          Front 9 – {teamNames[0]}: {front9 ? front9.team1 : "-"} | {teamNames[1]}: {front9 ? front9.team2 : "-"}
        </h4>
        <h4>
          Back 9 – {teamNames[0]}: {back9 ? back9.team1 : "-"} | {teamNames[1]}: {back9 ? back9.team2 : "-"}
        </h4>
      </div>
    ); 
    
    
  })();

  const matchPlayStatusBlock = (() => {
    if (!["teamMatch18", "teamMatch9", "teamMatchFront9", "teamMatchBack9", "individualMatch18"].includes(matchType)) return null;
  
    let result = null;
  
    if (matchType === "teamMatch18") {
      const allHoles = [...Array(18).keys()];
      result = getTeamScore(teamPlayers.team1, teamPlayers.team2, allHoles);
    } else if (matchType.startsWith("teamMatch")) {
      const holes = visibleHalf === "front" ? [...Array(9).keys()] : [...Array(9).keys()].map(i => i + 9);
      result = getTeamScore(teamPlayers.team1, teamPlayers.team2, holes);
    } else if (matchType.startsWith("individualMatch")) {
      const pairings = selectedMatch?.pairings?.[visibleHalf] || [];
      const holes = visibleHalf === "front" ? [...Array(9).keys()] : [...Array(9).keys()].map(i => i + 9);
      result = getIndividualMatchScore(pairings, holes);
    }
  
    if (!result) return null;
  
    const teamNames = matchType.startsWith("team")
      ? [
          matchData.teams.find(t => t.players.some(p => p.name === teamPlayers.team1[0]))?.name || "Team A",
          matchData.teams.find(t => t.players.some(p => p.name === teamPlayers.team2[0]))?.name || "Team B"
        ]
      : ["Team A", "Team B"];
  
    return (
      <div className="match-status" style={{ marginBottom: "10px" }}>
        <strong>
          {matchType === "teamMatch18"
            ? "18-Hole Match Score"
            : `${visibleHalf === "front" ? "Front 9" : "Back 9"} Match Score`}
        </strong>
        : {teamNames[0]}: {result.team1} | {teamNames[1]}: {result.team2}
      </div>
    );
  })();
  

  return (
    <div className="container" ref={scorecardRef}>

      <div className="course-details">
        <h3>{matchData.course.course_name}</h3>
        <p>{matchData.teeBox.tee_name} - {matchData.teeBox.total_yards} yards</p>
      </div>

      {bestBallStatusBlock}

      
{matchType === "stableford" && teamPoints && (
  <>
    <h4>🏆 Stableford Team Points</h4>  
        <div className="stableford-team-grid">
          {Object.entries(teamPoints).map(([teamName, value]) => (
            <div key={teamName} className={`team-score-box ${
              teamName === "Ball Busterz" ? "team-red" :
              teamName === "Golden Tees" ? "team-gold" :
              teamName === "Black Tee Titans" ? "team-black" :
              teamName === "Just the Tips" ? "team-blue" : ""
            }`}>
              <span className="team-name">{teamName}: </span>
              <span className="team-points">{value.total} pts</span>
            </div>
          ))}
        </div>
        </>
      )}
      

      {matchType === "stableford" && (
        <div className="stableford-breakdown-grid">
          <div><strong>+2 = -1</strong> / +1 = 0</div>
          <div><strong>E = +0.5</strong> / -1 = +1</div>
          <div><strong>-2 = +2</strong> / -3 = +3</div>
          <div><strong>0.5–6 pts:</strong> 0.5 team point</div>
          <div><strong>6.5–9 pts:</strong> 1 team point</div>
          <div><strong>9.5–12 pts:</strong> 1.5 team point</div>
          <div><strong>12.5–15 pts:</strong> 2 team points</div>
          <div><strong>15.5–18 pts:</strong> 2.5 team points</div>
          <div><strong>18.5+ pts:</strong> 3 team points</div>
        </div>
      )}

<div style={{ marginBottom: "10px" }}>
  <button
    onClick={() => {
      setVisibleHalf("front");
      setScorecardTab("front9");  // 🧠 this triggers the player order change
    }}
    style={{ 
      marginRight: "10px", 
      fontWeight: visibleHalf === "front" ? "bold" : "normal" 
    }}
  >
    Front 9
  </button>
  <button
    onClick={() => {
      setVisibleHalf("back");
      setScorecardTab("back9");  // 🧠 switch to back 9 players
    }}
    style={{ 
      fontWeight: visibleHalf === "back" ? "bold" : "normal" 
    }}
  >
    Back 9
  </button>
</div>


{matchPlayStatusBlock}

{matchType === "individualMatch9" && selectedMatch?.pairings?.[scorecardTab] && (
  <div className="match-status" style={{ marginBottom: "10px" }}>
    <h4>{scorecardTab === "front9" ? "Front 9 Match Scores" : "Back 9 Match Scores"}</h4>
    {getIndividualMatchScore(
      Object.values(selectedMatch.pairings[scorecardTab]),
      scorecardTab === "front9" ? [...Array(9).keys()] : [...Array(9).keys()].map(i => i + 9)
    ).map((match, idx) => (
      <p key={idx}>
        {match.playerA} vs {match.playerB}: {match.pointsA} - {match.pointsB}
      </p>
    ))}
  </div>
)}


    <div className="scorecard-wrapper">
      <table border="1" className="header-table">
      <colgroup>
        <col className="narrow-column" />
        <col className="narrow-column" />
        <col className="narrow-column" />
        <col className="narrow-column" />
        {localPlayers.map((_, idx) => (
          <col key={idx} className="player-column" />
        ))}
      </colgroup>

        <thead>
          <tr>
            <th colSpan="4" style={{ textAlign: 'right' }}>Total:</th>
            {localPlayers.map((p, idx) => (
              <th key={idx} className="player-total">
                {getGrossTotal(p.name)} / {getNetTotal(p.name, parseInt(p.handicap))}
                {matchType === "stableford" && ` / ${getStablefordPoints(p.name)} pts`}
              </th>
            ))}
          </tr>

          <tr>
            <th>Hole</th>
            <th>Yrds</th>
            <th>Par</th>
            <th>HCP</th>
            {localPlayers.map((p, idx) => {
              let matchupLabel = "";

              if (matchType === "individualMatch9") {
                const { front9, back9 } = getMatchPairings() || { front9: [], back9: [] };
              
                const currentPairs = scorecardTab === "front9" ? front9 : back9;
                const match = currentPairs.find(pair => pair.playerA === p.name || pair.playerB === p.name);
              
                if (match) {
                  const opponent = match.playerA === p.name ? match.playerB : match.playerA;
                  matchupLabel = `vs ${opponent}`;
                }
              }
              

              return (
                <th
                key={idx}
                className="player-name-header"
                style={{
                  backgroundColor: p.teamColor,
                  color: getContrastTextColor(p.teamColor)
                }}
                >
                  {p.name}
                  {matchType === "individualMatch9" && (
                    <div style={{ fontSize: "0.65em", fontWeight: "normal" }}>{matchupLabel}</div>
                  )}
                </th>

              );
            })}
          </tr>

        </thead>
        </table>
          {/* Table 2: Scrollable body */}
        <div className="scrollable-body">
          <table className="body-table">
          <colgroup>
            <col className="narrow-column" />
            <col className="narrow-column" />
            <col className="narrow-column" />
            <col className="narrow-column" />
            {localPlayers.map((_, idx) => (
              <col key={idx} className="player-column" />
            ))}
          </colgroup>

          <tbody>
            {holes
              .filter((_, idx) => visibleHalf === "front" ? idx < 9 : idx >= 9)
              .map((hole, idx) => {
                const realIndex = visibleHalf === "front" ? idx : idx + 9;

                return (
                  <tr key={realIndex}>


                    <td className="narrow-column hole-number" onClick={() => {
                      const imgUrl = matchData.holeImages?.[realIndex + 1];
                      if (imgUrl) setSelectedHoleImage(imgUrl);
                    }}>
                      {realIndex + 1}
                    </td>
                    <td className="narrow-column">{hole.yardage}</td>
                    <td className="narrow-column">{hole.par}</td>
                    <td className="narrow-column">{hole.handicap}</td>
                    {localPlayers.map((p) => {
                      const gross = scores[p.name]?.[realIndex]?.gross ?? "";
                      const net = scores[p.name]?.[realIndex]?.net ?? "";

                      let highlightClass = "";
                      if (matchType === "bestBall1" || matchType === "bestBall2") {
                        const team1Scores = teamPlayers.team1
                          .map(name => ({ name, net: scores[name]?.[realIndex]?.net }))
                          .filter(entry => entry.net != null && !isNaN(entry.net));
                        const team2Scores = teamPlayers.team2
                          .map(name => ({ name, net: scores[name]?.[realIndex]?.net }))
                          .filter(entry => entry.net != null && !isNaN(entry.net));

                        const team1Best = Math.min(...team1Scores.map(e => e.net));
                        const team2Best = Math.min(...team2Scores.map(e => e.net));

                        let winningTeam = null;
                        if (team1Best < team2Best) winningTeam = "team1";
                        else if (team2Best < team1Best) winningTeam = "team2";

                        const isWinner = (
                          (winningTeam === "team1" && teamPlayers.team1.includes(p.name)) ||
                          (winningTeam === "team2" && teamPlayers.team2.includes(p.name))
                        );

                        if (isWinner) {
                          const teamName = p.teamName || "";
                          highlightClass =
                            teamName === "Ball Busterz" ? "highlight-red" :
                            teamName === "Golden Tees" ? "highlight-gold" :
                            teamName === "Black Tee Titans" ? "highlight-black" :
                            teamName === "Just the Tips" ? "highlight-blue" : "";
                        }
                      }

                      let points = "";
                      if (matchType === "stableford" && net !== "") {
                        const diff = net - hole.par;
                        if (diff >= 2) points = -1;
                        else if (diff === 1) points = 0;
                        else if (diff === 0) points = 0.5;
                        else if (diff === -1) points = 1;
                        else if (diff === -2) points = 2;
                        else if (diff === -3) points = 3;
                        else if (diff <= -4) points = 4;
                      }

                      return (
                        <td
                          key={p.name}
                          style={{
                            backgroundColor: (() => {
                              if (["teamMatch18", "teamMatch9", "teamMatchFront9", "teamMatchBack9"].includes(matchType)) {
                                const winner = getMatchPlayHoleWinner(realIndex);
                                if (!winner || winner === "tie") return "white";

                                const winningTeam = winner === "team1" ? teamPlayers.team1 : teamPlayers.team2;
                                if (winningTeam.includes(p.name)) {
                                  const teamColor = p.teamColor?.toLowerCase();
                                  return teamColor === "red" ? "#ffcccc" :
                                        teamColor === "yellow" ? "#ffffcc" :
                                        teamColor === "blue" ? "#cce5ff" :
                                        teamColor === "black" ? "#d9d9d9" :
                                        teamColor === "green" ? "#ccffcc" :
                                        teamColor === "purple" ? "#e0ccff" :
                                        teamColor === "orange" ? "#ffe5cc" : "white";
                                }
                              }
                              return "white";
                            })()
                          }}
                        >

                          <input
                            type="number"
                            min="1"
                            max="10"
                            className="score-input"
                            value={scores[p.name]?.[realIndex]?.gross || ""}
                            onChange={(e) => updateScore(p.name, realIndex, e.target.value)}
                          />
                          <div style={{ fontSize: "1.0em", color: "black" }}>
                            {net !== "" && <>Net: {net}</>}
                            <br />
                            {(() => {
                              const playerHandicap = parseInt(p.handicap || 0);
                              const holeHcp = holes[realIndex]?.handicap || 0;
                              let strokesGiven = 0;
                              if (playerHandicap >= holeHcp) strokesGiven = 1;
                              if (playerHandicap >= holeHcp + 18) strokesGiven = 2;
                              return <span style={{ fontSize: "0.65em" }}>Strokes: {strokesGiven}</span>;
                            })()}
                            {matchType === "stableford" && net !== "" && (
                              <>
                                <br />
                                Pts: {points}
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>

      </table>
      </div>
      {selectedHoleImage && (
        <div className="hole-image-overlay" onClick={() => setSelectedHoleImage(null)}>
          <div className="hole-image-modal">
            <img src={selectedHoleImage} alt="Hole view" />
            <button onClick={() => setSelectedHoleImage(null)}>Return to Match</button>
          </div>
        </div>
      )}
      </div>

      {/*<button onClick={saveScoresToFirebase}>Save Scores</button> */}
      <button onClick={exportToExcel}>Download Excel</button>
      <button onClick={exportScorecardAsImage}>Download Image</button>


    
    </div>
  );
}

export default ScoreEntry;
