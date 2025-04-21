function Scorecard({ selectedPlayers, matchId, goBack }) {
  const [matchData, setMatchData] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId) return;
      const matchRef = doc(db, "matches", matchId);
      const matchSnap = await getDoc(matchRef);

      if (matchSnap.exists()) {
        const data = matchSnap.data();
        setMatchData(data);

        const initialScores = {};
        data.players.forEach(player => {
          initialScores[player.name] = data.scores?.[player.name] || {};
        });
        setScores(initialScores);
      }
    };

    fetchMatchData();
  }, [matchId]);

  const handleScoreChange = async (playerName, hole, value) => {
    const newScores = { ...scores };
    newScores[playerName] = { ...newScores[playerName], [hole]: Number(value) || 0 };
    setScores(newScores);

    const matchRef = doc(db, "matches", matchId);
    await updateDoc(matchRef, {
      [`scores.${playerName}`]: newScores[playerName],
    });
  };

  if (!matchData) return <p>Loading match details...</p>;

  return (
    <div>
      <h1>Scorecard</h1>
      <button onClick={goBack}>Back</button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", textAlign: "center" }}>
        <div><strong>Hole</strong></div>
        <div><strong>Yards</strong></div>
        <div><strong>Par</strong></div>
        <div><strong>HCP</strong></div>
        {selectedPlayers.map(player => (
          <div key={player}><strong>{player}</strong></div>
        ))}

        {matchData.holes.map((hole, index) => (
          <>
            <div>{index + 1}</div>
            <div>{hole.yards}</div>
            <div>{hole.par}</div>
            <div>{hole.hcp}</div>

            {selectedPlayers.map(player => (
              <input
                key={`${player}-hole-${index}`}
                type="number"
                value={scores[player]?.[index] || ""}
                onChange={(e) => handleScoreChange(player, index, e.target.value)}
                style={{ width: "50px" }}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
