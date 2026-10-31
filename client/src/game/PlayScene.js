import Phaser from 'phaser'

const LEVEL_WIDTH = 960
const LEVEL_HEIGHT = 540

const levelLayouts = [
  [
    { x: 170, y: 420, width: 230, height: 24 },
    { x: 455, y: 345, width: 190, height: 24 },
    { x: 720, y: 265, width: 210, height: 24 },
    { x: 850, y: 410, width: 150, height: 24 },
  ],
  [
    { x: 145, y: 390, width: 180, height: 24 },
    { x: 370, y: 300, width: 155, height: 24 },
    { x: 590, y: 390, width: 190, height: 24 },
    { x: 805, y: 285, width: 175, height: 24 },
  ],
  [
    { x: 175, y: 430, width: 225, height: 24 },
    { x: 420, y: 355, width: 150, height: 24 },
    { x: 625, y: 285, width: 170, height: 24 },
    { x: 825, y: 365, width: 175, height: 24 },
  ],
]

function colorNumber(value, fallback) {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value.replace('#', ''), 16)
  return Number.isNaN(parsed) ? fallback : parsed
}

function themeIndex(theme = '') {
  return [...theme].reduce((total, character) => total + character.charCodeAt(0), 0) % levelLayouts.length
}

function readableText(value, fallback, maxLength) {
  const text = typeof value === 'string' && value.trim() ? value.trim() : fallback
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}

export default class PlayScene extends Phaser.Scene {
  constructor({ characterSpriteUrl, backgroundImageUrl, gameConfig }) {
    super({ key: 'DrawToGameScene' })
    this.characterSpriteUrl = characterSpriteUrl
    this.backgroundImageUrl = backgroundImageUrl
    this.gameConfig = gameConfig
    this.texturePrefix = `draw-game-${Phaser.Utils.String.UUID()}`
    this.playerTextureKey = `${this.texturePrefix}-player`
    this.placeholderTextureKey = `${this.texturePrefix}-placeholder-player`
    this.backgroundTextureKey = `${this.texturePrefix}-background`
    this.platformTextureKey = `${this.texturePrefix}-platform`
    this.obstacleTextureKey = `${this.texturePrefix}-obstacle`
    this.collectibleTextureKey = `${this.texturePrefix}-collectible`
    this.score = 0
    this.hasWon = false
    this.touchControls = { left: false, right: false, jump: false }
  }

  preload() {
    if (this.characterSpriteUrl) this.load.image(this.playerTextureKey, this.characterSpriteUrl)
    if (this.backgroundImageUrl) this.load.image(this.backgroundTextureKey, this.backgroundImageUrl)
  }

  create() {
    this.score = 0
    this.hasWon = false
    this.touchControls = { left: false, right: false, jump: false }
    this.physics.resume()
    this.colors = {
      background: colorNumber(this.gameConfig.backgroundColor, 0xbfe9ff),
      player: colorNumber(this.gameConfig.playerColor, 0x2457f5),
      obstacle: colorNumber(this.gameConfig.obstacleColor, 0xef5b45),
      collectible: colorNumber(this.gameConfig.collectibleColor, 0xffc928),
    }

    this.cameras.main.setBackgroundColor(this.colors.background)
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT)
    this.createBackdrop()
    this.createGeneratedTextures()
    this.createLevel()
    this.createPlayer()
    this.createHud()
    this.createControls()

    if (this.player) {
      this.physics.add.collider(this.player, this.platforms)
      this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, undefined, this)
      this.physics.add.overlap(this.player, this.collectibles, this.collectItem, undefined, this)
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this)
  }

  createBackdrop() {
    const isDark = Phaser.Display.Color.IntegerToColor(this.colors.background).lightness < 45
    const cloudColor = isDark ? 0x315b73 : 0xffffff
    const hillColor = isDark ? 0x234f49 : 0x78c98a

    if (this.textures.exists(this.backgroundTextureKey)) {
      const background = this.add.image(LEVEL_WIDTH / 2, LEVEL_HEIGHT / 2, this.backgroundTextureKey).setDepth(-30)
      background.setScale(Math.max(LEVEL_WIDTH / background.width, LEVEL_HEIGHT / background.height))
      this.add.rectangle(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT, this.colors.background, isDark ? 0.38 : 0.24).setOrigin(0).setDepth(-29)
    }

    for (let index = 0; index < 6; index += 1) {
      this.add.circle(90 + index * 180, 105 + (index % 2) * 42, 45 + (index % 3) * 12, cloudColor, isDark ? 0.12 : 0.28)
    }

    this.add.ellipse(220, 510, 620, 210, hillColor, 0.42)
    this.add.ellipse(745, 500, 720, 230, hillColor, 0.58)
    this.add.text(24, 474, this.gameConfig.theme, {
      color: isDark ? '#dff7ff' : '#163b52',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setAlpha(0.75)
  }

  createGeneratedTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false })
    graphics.fillStyle(this.colors.player, 1).fillRect(0, 0, 16, 16)
    graphics.generateTexture(this.platformTextureKey, 16, 16)
    graphics.clear()
    graphics.fillStyle(this.colors.obstacle, 1).fillRect(0, 0, 16, 16)
    graphics.generateTexture(this.obstacleTextureKey, 16, 16)
    graphics.clear()
    graphics.fillStyle(this.colors.collectible, 1).fillCircle(15, 15, 12)
    graphics.lineStyle(4, 0xffffff, 0.45).strokeCircle(15, 15, 13)
    graphics.generateTexture(this.collectibleTextureKey, 30, 30)
    graphics.clear()
    graphics.fillStyle(this.colors.player, 1).fillRoundedRect(9, 16, 54, 58, 22)
    graphics.fillStyle(0xffffff, 1).fillCircle(27, 37, 9).fillCircle(46, 37, 9)
    graphics.fillStyle(0x0c1746, 1).fillCircle(29, 38, 4).fillCircle(48, 38, 4)
    graphics.lineStyle(4, 0x0c1746, 1).strokeRoundedRect(9, 16, 54, 58, 22)
    graphics.lineStyle(6, this.colors.player, 1).lineBetween(17, 70, 9, 83).lineBetween(55, 70, 63, 83)
    graphics.generateTexture(this.placeholderTextureKey, 72, 88)
    graphics.destroy()
  }

  createLevel() {
    this.platforms = this.physics.add.staticGroup()
    this.obstacles = this.physics.add.staticGroup()
    this.collectibles = this.physics.add.staticGroup()
    this.addPlatform(480, 520, 960, 40)

    const layout = levelLayouts[themeIndex(this.gameConfig.theme)]
    layout.forEach((platform) => this.addPlatform(platform.x, platform.y, platform.width, platform.height))

    ;[
      { x: 315, y: 488, width: 42, height: 24 },
      { x: 585, y: 488, width: 48, height: 24 },
      { x: 775, y: 488, width: 42, height: 24 },
    ].forEach(({ x, y, width, height }) => {
      this.obstacles.create(x, y, this.obstacleTextureKey).setDisplaySize(width, height).refreshBody()
    })

    const collectibleCount = Phaser.Math.Clamp(Number(this.gameConfig.collectibleCount) || 6, 1, 12)
    const collectibleSpots = [
      { x: 165, y: 375 },
      ...layout.map((platform) => ({ x: platform.x, y: platform.y - 42 })),
      { x: 520, y: 460 },
      { x: 700, y: 460 },
      { x: 885, y: 460 },
      { x: 80, y: 460 },
    ]

    for (let index = 0; index < collectibleCount; index += 1) {
      const spot = collectibleSpots[index % collectibleSpots.length]
      const cycleOffset = Math.floor(index / collectibleSpots.length) * 38
      this.collectibles.create(spot.x + cycleOffset, spot.y, this.collectibleTextureKey).setScale(0.85).refreshBody()
    }
    this.totalCollectibles = collectibleCount
  }

  addPlatform(x, y, width, height) {
    this.platforms.create(x, y, this.platformTextureKey).setDisplaySize(width, height).setAlpha(y > 500 ? 0.95 : 0.82).refreshBody()
  }

  createPlayer() {
    const textureKey = this.textures.exists(this.playerTextureKey) ? this.playerTextureKey : this.placeholderTextureKey
    this.playerGlow = this.add.ellipse(88, 450, 76, 28, this.colors.player, 0.45).setDepth(4)
    this.player = this.physics.add.sprite(88, 450, textureKey).setDepth(5)
    const frameWidth = this.player.width
    const frameHeight = this.player.height
    const maxWidth = textureKey === this.playerTextureKey ? 92 : 70
    const maxHeight = textureKey === this.playerTextureKey ? 104 : 86
    this.player.setScale(Math.min(maxWidth / frameWidth, maxHeight / frameHeight))
    this.player.setCollideWorldBounds(true).setBounce(0.05)
    this.player.body.setSize(frameWidth * 0.58, frameHeight * 0.78, true)
    this.player.body.setOffset(frameWidth * 0.21, frameHeight * 0.18)
  }

  createHud() {
    const textColor = Phaser.Display.Color.IntegerToColor(this.colors.background).lightness < 45 ? '#ffffff' : '#0c1746'
    const title = readableText(this.gameConfig.title, 'The Drawing Quest', 58)
    const titleSize = title.length > 42 ? '18px' : title.length > 30 ? '21px' : '25px'
    const character = readableText(this.gameConfig.character, 'Sketch Hero', 32)
    const theme = readableText(this.gameConfig.theme, 'Drawn World', 30)
    this.add.rectangle(0, 0, LEVEL_WIDTH, 72, 0xffffff, 0.78).setOrigin(0).setDepth(20)
    this.add.text(24, 17, title, { color: textColor, fontFamily: 'Arial, sans-serif', fontSize: titleSize, fontStyle: 'bold' }).setDepth(21)
    this.add.text(25, 46, `${character} · ${theme}`, { color: textColor, fontFamily: 'Arial, sans-serif', fontSize: '12px' }).setAlpha(0.72).setDepth(21)
    this.scoreText = this.add.text(936, 23, `SCORE  0 / ${this.totalCollectibles}`, { color: textColor, fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(21)
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys('A,D,W,R,SPACE')
    this.controlHandler = (control, pressed) => {
      if (control in this.touchControls) this.touchControls[control] = pressed
    }
    this.game.events.on('player-control', this.controlHandler)
  }

  collectItem(_player, collectible) {
    if (this.hasWon || !collectible.active) return
    collectible.destroy()
    this.game.events.emit('game-sound', 'collect')
    this.score += 1
    this.scoreText.setText(`SCORE  ${this.score} / ${this.totalCollectibles}`)
    if (this.score >= this.totalCollectibles) this.showWinState()
  }

  hitObstacle() {
    if (!this.player?.active || this.hasWon) return
    this.game.events.emit('game-sound', 'hit')
    this.player.setVelocity(0, 0).setPosition(88, 445)
    this.cameras.main.shake(120, 0.008)
    this.player.setTint(this.colors.obstacle)
    this.time.delayedCall(180, () => this.player?.clearTint())
  }

  showWinState() {
    if (this.hasWon) return
    this.hasWon = true
    this.game.events.emit('game-sound', 'win')
    this.player.setVelocity(0, 0)
    this.physics.pause()
    this.add.rectangle(LEVEL_WIDTH / 2, LEVEL_HEIGHT / 2, 520, 250, 0x0c1746, 0.94).setDepth(40)
    this.add.text(LEVEL_WIDTH / 2, 205, 'YOU WIN!', { color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '52px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(41)
    this.add.text(LEVEL_WIDTH / 2, 258, `All ${this.totalCollectibles} treasures collected`, { color: '#dff7ff', fontFamily: 'Arial, sans-serif', fontSize: '20px' }).setOrigin(0.5).setDepth(41)

    const restartButton = this.add.rectangle(LEVEL_WIDTH / 2, 330, 190, 54, this.colors.player).setDepth(41).setInteractive({ useHandCursor: true })
    this.add.text(LEVEL_WIDTH / 2, 330, 'PLAY AGAIN', { color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(42)
    restartButton.on('pointerover', () => restartButton.setAlpha(0.82))
    restartButton.on('pointerout', () => restartButton.setAlpha(1))
    restartButton.on('pointerdown', () => this.scene.restart())
  }

  update() {
    if (!this.player?.body || this.hasWon) {
      if (Phaser.Input.Keyboard.JustDown(this.keys?.R)) this.scene.restart()
      return
    }

    const moveLeft = this.cursors.left.isDown || this.keys.A.isDown || this.touchControls.left
    const moveRight = this.cursors.right.isDown || this.keys.D.isDown || this.touchControls.right
    const jump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown || this.touchControls.jump

    if (moveLeft) this.player.setVelocityX(-220)
    else if (moveRight) this.player.setVelocityX(220)
    else this.player.setVelocityX(0)

    if (jump && this.player.body.blocked.down) this.player.setVelocityY(-480)
    this.playerGlow?.setPosition(this.player.x, this.player.y + this.player.displayHeight * 0.38)
  }

  cleanUp() {
    if (this.controlHandler) this.game.events.off('player-control', this.controlHandler)
    ;[
      this.playerTextureKey,
      this.placeholderTextureKey,
      this.backgroundTextureKey,
      this.platformTextureKey,
      this.obstacleTextureKey,
      this.collectibleTextureKey,
    ].forEach((key) => {
      if (this.textures.exists(key)) this.textures.remove(key)
    })
  }
}
