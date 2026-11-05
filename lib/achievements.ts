export interface AchievementStats {
  totalMatches: number
  wins: number
  highestScore: number
  totalCorrect: number
  topicsPractised: number
}

export const ACHIEVEMENTS = [
  { id: 'firstGame', goal: 1, progress: (stats: AchievementStats) => stats.totalMatches },
  { id: 'firstWin', goal: 1, progress: (stats: AchievementStats) => stats.wins },
  { id: 'tenWins', goal: 10, progress: (stats: AchievementStats) => stats.wins },
  { id: 'highScore', goal: 100, progress: (stats: AchievementStats) => stats.highestScore },
  { id: 'fiftyCorrect', goal: 50, progress: (stats: AchievementStats) => stats.totalCorrect },
  { id: 'allRounder', goal: 5, progress: (stats: AchievementStats) => stats.topicsPractised },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']

export function evaluateAchievements(stats: AchievementStats) {
  return ACHIEVEMENTS.map(({ id, goal, progress }) => {
    const value = Math.min(progress(stats), goal)
    return { id, goal, value, isUnlocked: value >= goal }
  })
}
