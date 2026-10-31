import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import PlayScene from './PlayScene.js'
import './Game.css'

function Game({ characterSpriteUrl, backgroundImageUrl, gameConfig }) {
  const mountRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return undefined

    const scene = new PlayScene({ characterSpriteUrl, backgroundImageUrl, gameConfig })
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mountRef.current,
      width: 960,
      height: 540,
      backgroundColor: gameConfig.backgroundColor,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 980 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 540,
      },
      render: {
        antialias: true,
        transparent: false,
      },
      scene,
    })

    gameRef.current = game

    return () => {
      gameRef.current = null
      game.destroy(true)
    }
  }, [backgroundImageUrl, characterSpriteUrl, gameConfig])

  return (
    <div className="phaser-game">
      <div className="phaser-game__canvas" ref={mountRef} aria-label={`${gameConfig.title} playable platformer`} />
      <p className="phaser-game__instructions">Move with ← → or A/D · Jump with ↑, W or Space · Collect every treasure · Press R to restart</p>
      <div className="phaser-game__touch-controls" aria-label="Touch game controls">
        <button
          type="button"
          aria-label="Move left"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            gameRef.current?.events.emit('player-control', 'left', true)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            gameRef.current?.events.emit('player-control', 'left', false)
          }}
          onPointerCancel={() => gameRef.current?.events.emit('player-control', 'left', false)}
        >LEFT</button>
        <button
          type="button"
          aria-label="Jump"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            gameRef.current?.events.emit('player-control', 'jump', true)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            gameRef.current?.events.emit('player-control', 'jump', false)
          }}
          onPointerCancel={() => gameRef.current?.events.emit('player-control', 'jump', false)}
        >JUMP</button>
        <button
          type="button"
          aria-label="Move right"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            gameRef.current?.events.emit('player-control', 'right', true)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            gameRef.current?.events.emit('player-control', 'right', false)
          }}
          onPointerCancel={() => gameRef.current?.events.emit('player-control', 'right', false)}
        >RIGHT</button>
      </div>
    </div>
  )
}

export default Game
