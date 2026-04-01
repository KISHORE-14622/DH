export const applyRollingScores = (existingScores, incomingScore) => {
  const merged = [...existingScores, incomingScore]
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 5);

  return merged;
};

export const toDrawNumbers = (scores) => {
  return scores.map((item) => item.score);
};
