const palettes = [
  { theme: 'Enchanted Forest', backgroundColor: '#bfe9ff', playerColor: '#2457f5', obstacleColor: '#ef5b45', collectibleColor: '#ffc928' },
  { theme: 'Candy Cloud Kingdom', backgroundColor: '#f6d9ff', playerColor: '#7b45d6', obstacleColor: '#ee4f87', collectibleColor: '#55d7c5' },
  { theme: 'Moonlit Jungle', backgroundColor: '#163b52', playerColor: '#7ed957', obstacleColor: '#ff7a34', collectibleColor: '#ffe36e' },
]

export const DEFAULT_MOCK_GAME_CONFIG = Object.freeze({
  gameType: 'platformer',
  title: 'The Drawing Quest',
  character: 'Sketch Hero',
  theme: palettes[0].theme,
  backgroundColor: palettes[0].backgroundColor,
  playerColor: palettes[0].playerColor,
  obstacleColor: palettes[0].obstacleColor,
  collectibleColor: palettes[0].collectibleColor,
  collectibleCount: 6,
  audioPrompt: 'A playful, upbeat platformer adventure theme.',
})

function hashFile(file) {
  const input = `${file.name}:${file.size}:${file.lastModified}`
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function drawingName(fileName) {
  const name = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!name) return 'Drawing'
  const label = name.split(' ').slice(0, 4).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
  return label.length > 32 ? `${label.slice(0, 31).trimEnd()}…` : label
}

export function createMockGameConfig(file) {
  const hash = hashFile(file)
  const palette = palettes[file.size % palettes.length]
  const name = drawingName(file.name)

  return {
    gameType: 'platformer',
    title: `${name} Adventure`,
    character: `${name} Hero`,
    theme: palette.theme,
    backgroundColor: palette.backgroundColor,
    playerColor: palette.playerColor,
    obstacleColor: palette.obstacleColor,
    collectibleColor: palette.collectibleColor,
    collectibleCount: 5 + (hash % 4),
    audioPrompt: `A playful platformer soundtrack for ${name} in the ${palette.theme}.`,
  }
}
