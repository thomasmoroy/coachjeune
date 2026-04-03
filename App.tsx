import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
interface Position {
  x: number;
  y: number;
}

interface Velocity {
  vx: number;
  vy: number;
}

interface Entity extends Position, Velocity {
  id: number;
  width: number;
  height: number;
  color: string;
  health: number;
  maxHealth: number;
}

interface Player extends Entity {
  speed: number;
  fireRate: number;
  lastFired: number;
  weaponLevel: number;
  invincible: boolean;
  invincibleTimer: number;
}

interface Enemy extends Entity {
  type: 'basic' | 'fast' | 'tank' | 'shooter';
  scoreValue: number;
  shootCooldown?: number;
}

interface Bullet extends Entity {
  isPlayer: boolean;
  damage: number;
}

interface Particle extends Position, Velocity {
  id: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  decay: number;
}

interface PowerUp extends Position, Velocity {
  id: number;
  type: 'weapon' | 'health' | 'shield' | 'bomb';
  width: number;
  height: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
  level: number;
  lives: number;
  combo: number;
  comboTimer: number;
}

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_SPAWN_RATE_INITIAL = 60;
const FPS = 60;

const COLORS = {
  player: '#00ffff',
  playerBullet: '#ff00ff',
  enemyBasic: '#ff4444',
  enemyFast: '#ffff00',
  enemyTank: '#ff8800',
  enemyShooter: '#aa00ff',
  enemyBullet: '#ff6666',
  powerupWeapon: '#00ff00',
  powerupHealth: '#ff00ff',
  powerupShield: '#0088ff',
  powerupBomb: '#ffaa00',
  bg: '#0a0a1a',
  text: '#ffffff',
};

// --- Audio System ---
class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.enabled = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.3) {
    if (!this.ctx || !this.enabled) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playShoot() {
    this.playTone(800, 'square', 0.1, 0.2);
    setTimeout(() => this.playTone(600, 'square', 0.1, 0.2), 50);
  }

  playEnemyHit() {
    this.playTone(200, 'sawtooth', 0.15, 0.2);
  }

  playExplosion() {
    this.playTone(100, 'sawtooth', 0.3, 0.4);
    setTimeout(() => this.playTone(80, 'square', 0.3, 0.3), 100);
  }

  playPowerUp() {
    this.playTone(1000, 'sine', 0.1, 0.3);
    setTimeout(() => this.playTone(1500, 'sine', 0.15, 0.3), 100);
  }

  playPlayerHit() {
    this.playTone(150, 'sawtooth', 0.4, 0.5);
    setTimeout(() => this.playTone(100, 'square', 0.4, 0.4), 200);
  }

  playGameOver() {
    [400, 350, 300, 250, 200].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.3, 0.4), i * 200);
    });
  }
}

const soundSystem = new SoundSystem();

// --- Helper Functions ---
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const checkCollision = (a: Entity | Bullet | Player, b: Entity | Bullet | Player | PowerUp) => {
  return (
    a.x < b.x + (b as any).width &&
    a.x + a.width > b.x &&
    a.y < b.y + (b as any).height &&
    a.y + a.height > b.y
  );
};

// --- Main Component ---
const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('shmup_highscore') || '0'),
    level: 1,
    lives: 3,
    combo: 0,
    comboTimer: 0,
  });
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [uiLevel, setUiLevel] = useState(1);
  const [uiCombo, setUiCombo] = useState(0);

  // Game entities refs for performance
  const playerRef = useRef<Player | null>(null);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const starsRef = useRef<Star[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const frameCountRef = useRef(0);
  const enemySpawnRateRef = useRef(ENEMY_SPAWN_RATE_INITIAL);
  const animationFrameRef = useRef<number>(0);

  // Initialize stars background
  const initStars = useCallback(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 0.5,
        brightness: Math.random(),
      });
    }
    starsRef.current = stars;
  }, []);

  // Initialize player
  const initPlayer = useCallback(() => {
    playerRef.current = {
      id: Date.now(),
      x: CANVAS_WIDTH / 2 - 20,
      y: CANVAS_HEIGHT - 80,
      vx: 0,
      vy: 0,
      width: 40,
      height: 40,
      color: COLORS.player,
      health: 1,
      maxHealth: 1,
      speed: PLAYER_SPEED,
      fireRate: 10,
      lastFired: 0,
      weaponLevel: 1,
      invincible: false,
      invincibleTimer: 0,
    };
  }, []);

  // Spawn enemy
  const spawnEnemy = useCallback(() => {
    if (!playerRef.current) return;

    const rand = Math.random();
    let type: Enemy['type'] = 'basic';
    let width = 30;
    let height = 30;
    let health = 1;
    let speed = 2;
    let color = COLORS.enemyBasic;
    let scoreValue = 100;

    if (rand < 0.1 && gameState.level >= 2) {
      type = 'tank';
      width = 50;
      height = 50;
      health = 5;
      speed = 1;
      color = COLORS.enemyTank;
      scoreValue = 300;
    } else if (rand < 0.3 && gameState.level >= 2) {
      type = 'fast';
      width = 25;
      height = 25;
      health = 1;
      speed = 4;
      color = COLORS.enemyFast;
      scoreValue = 150;
    } else if (rand < 0.5 && gameState.level >= 3) {
      type = 'shooter';
      width = 35;
      height = 35;
      health = 2;
      speed = 1.5;
      color = COLORS.enemyShooter;
      scoreValue = 200;
    }

    const enemy: Enemy = {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - width),
      y: -50,
      vx: type === 'fast' ? randomRange(-1, 1) : 0,
      vy: speed,
      width,
      height,
      color,
      health,
      maxHealth: health,
      type,
      scoreValue,
      shootCooldown: type === 'shooter' ? 120 : undefined,
    };

    enemiesRef.current.push(enemy);
  }, [gameState.level]);

  // Create explosion particles
  const createExplosion = useCallback((x: number, y: number, color: string, count: number = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + randomRange(-0.2, 0.2);
      const speed = randomRange(2, 6);
      particlesRef.current.push({
        id: Date.now() + Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: randomRange(2, 5),
        color,
        decay: randomRange(0.02, 0.05),
      });
    }
  }, []);

  // Spawn power-up
  const spawnPowerUp = useCallback((x: number, y: number) => {
    if (Math.random() > 0.15) return; // 15% chance

    const types: PowerUp['type'][] = ['weapon', 'health', 'shield', 'bomb'];
    const type = types[Math.floor(Math.random() * types.length)];
    let color = COLORS.powerupWeapon;

    switch (type) {
      case 'health': color = COLORS.powerupHealth; break;
      case 'shield': color = COLORS.powerupShield; break;
      case 'bomb': color = COLORS.powerupBomb; break;
    }

    powerUpsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      vx: 0,
      vy: 2,
      type,
      width: 25,
      height: 25,
    });
  }, []);

  // Start game
  const startGame = useCallback(() => {
    soundSystem.init();
    initStars();
    initPlayer();
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    frameCountRef.current = 0;
    enemySpawnRateRef.current = ENEMY_SPAWN_RATE_INITIAL;

    setGameState({
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      highScore: parseInt(localStorage.getItem('shmup_highscore') || '0'),
      level: 1,
      lives: 3,
      combo: 0,
      comboTimer: 0,
    });
    setUiScore(0);
    setUiLives(3);
    setUiLevel(1);
    setUiCombo(0);
  }, [initStars, initPlayer]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      if (e.code === 'Escape' && gameState.isPlaying) {
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
      }
      
      if (e.code === 'Enter' && (gameState.isGameOver || !gameState.isPlaying)) {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isPlaying, gameState.isGameOver, startGame]);

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Clear canvas
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Update and draw stars
      starsRef.current.forEach(star => {
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      frameCountRef.current++;

      // Player movement
      if (playerRef.current) {
        const player = playerRef.current;
        
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyQ']) player.x -= player.speed;
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) player.x += player.speed;
        if (keysRef.current['ArrowUp'] || keysRef.current['KeyZ']) player.y -= player.speed;
        if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) player.y += player.speed;

        // Clamp to screen
        player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
        player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));

        // Shooting
        if ((keysRef.current['Space'] || keysRef.current['Enter']) && frameCountRef.current - player.lastFired > player.fireRate) {
          player.lastFired = frameCountRef.current;
          soundSystem.playShoot();

          // Create bullets based on weapon level
          const bulletPositions = [
            { x: player.x + player.width / 2 - 3, y: player.y, vx: 0, vy: -BULLET_SPEED },
          ];

          if (player.weaponLevel >= 2) {
            bulletPositions.push(
              { x: player.x, y: player.y + 10, vx: -2, vy: -BULLET_SPEED * 0.9 },
              { x: player.x + player.width, y: player.y + 10, vx: 2, vy: -BULLET_SPEED * 0.9 }
            );
          }

          if (player.weaponLevel >= 3) {
            bulletPositions.push(
              { x: player.x - 5, y: player.y + 20, vx: -3, vy: -BULLET_SPEED * 0.8 },
              { x: player.x + player.width + 5, y: player.y + 20, vx: 3, vy: -BULLET_SPEED * 0.8 }
            );
          }

          bulletPositions.forEach(pos => {
            bulletsRef.current.push({
              id: Date.now() + Math.random(),
              x: pos.x,
              y: pos.y,
              vx: pos.vx,
              vy: pos.vy,
              width: 6,
              height: 15,
              color: COLORS.playerBullet,
              health: 1,
              maxHealth: 1,
              isPlayer: true,
              damage: 1,
            });
          });
        }

        // Invincibility timer
        if (player.invincible) {
          player.invincibleTimer--;
          if (player.invincibleTimer <= 0) {
            player.invincible = false;
          }
        }

        // Draw player with glow effect
        if (!player.invincible || Math.floor(frameCountRef.current / 4) % 2 === 0) {
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = player.color;
          ctx.fillStyle = player.color;
          
          // Draw ship shape
          ctx.beginPath();
          ctx.moveTo(player.x + player.width / 2, player.y);
          ctx.lineTo(player.x + player.width, player.y + player.height);
          ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10);
          ctx.lineTo(player.x, player.y + player.height);
          ctx.closePath();
          ctx.fill();

          // Engine flame
          ctx.fillStyle = '#ff6600';
          ctx.beginPath();
          ctx.moveTo(player.x + player.width / 2 - 5, player.y + player.height - 5);
          ctx.lineTo(player.x + player.width / 2 + 5, player.y + player.height - 5);
          ctx.lineTo(player.x + player.width / 2, player.y + player.height + randomRange(10, 20));
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
      }

      // Spawn enemies
      if (frameCountRef.current % Math.floor(enemySpawnRateRef.current) === 0) {
        spawnEnemy();
      }

      // Update and draw bullets
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Remove off-screen bullets
        if (bullet.y < -50 || bullet.y > CANVAS_HEIGHT + 50 || bullet.x < -50 || bullet.x > CANVAS_WIDTH + 50) {
          return false;
        }

        // Draw bullet
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.restore();

        return true;
      });

      // Update and draw enemies
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        // Movement patterns
        if (enemy.type === 'fast') {
          enemy.x += Math.sin(frameCountRef.current * 0.1) * 2;
        }

        // Shooter enemy logic
        if (enemy.type === 'shooter' && enemy.shootCooldown !== undefined) {
          enemy.shootCooldown--;
          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = 120;
            if (playerRef.current) {
              const dx = playerRef.current.x - enemy.x;
              const dy = playerRef.current.y - enemy.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              bulletsRef.current.push({
                id: Date.now() + Math.random(),
                x: enemy.x + enemy.width / 2 - 4,
                y: enemy.y + enemy.height,
                vx: (dx / dist) * 5,
                vy: (dy / dist) * 5,
                width: 8,
                height: 8,
                color: COLORS.enemyBullet,
                health: 1,
                maxHealth: 1,
                isPlayer: false,
                damage: 1,
              });
            }
          }
        }

        // Remove off-screen enemies
        if (enemy.y > CANVAS_HEIGHT + 50) {
          return false;
        }

        // Draw enemy
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = enemy.color;
        ctx.fillStyle = enemy.color;

        if (enemy.type === 'tank') {
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        } else if (enemy.type === 'fast') {
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          ctx.lineTo(enemy.x + enemy.width, enemy.y);
          ctx.lineTo(enemy.x, enemy.y);
          ctx.closePath();
          ctx.fill();
        } else if (enemy.type === 'shooter') {
          ctx.beginPath();
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
          ctx.fill();
          // Cannon
          ctx.fillRect(enemy.x + enemy.width / 2 - 5, enemy.y + enemy.height, 10, 10);
        } else {
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
          ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
          ctx.lineTo(enemy.x, enemy.y + enemy.height / 2);
          ctx.closePath();
          ctx.fill();
        }

        // Health bar for tanks
        if (enemy.type === 'tank' && enemy.health < enemy.maxHealth) {
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * (enemy.health / enemy.maxHealth), 4);
        }

        ctx.restore();

        // Check collision with player
        if (playerRef.current && !playerRef.current.invincible && checkCollision(playerRef.current, enemy)) {
          soundSystem.playPlayerHit();
          playerRef.current.invincible = true;
          playerRef.current.invincibleTimer = 120; // 2 seconds at 60fps
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 20);
          
          setGameState(prev => {
            const newLives = prev.lives - 1;
            if (newLives <= 0) {
              soundSystem.playGameOver();
              const newHighScore = Math.max(prev.score, prev.highScore);
              localStorage.setItem('shmup_highscore', newHighScore.toString());
              return { ...prev, lives: 0, isGameOver: true, highScore: newHighScore };
            }
            return { ...prev, lives: newLives };
          });
          setUiLives(prev => prev - 1);
          
          return false; // Destroy enemy on collision
        }

        return true;
      });

      // Check bullet collisions
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        let shouldRemove = false;

        if (bullet.isPlayer) {
          // Player bullet hitting enemies
          enemiesRef.current = enemiesRef.current.filter(enemy => {
            if (checkCollision(bullet, enemy)) {
              enemy.health -= bullet.damage;
              soundSystem.playEnemyHit();
              createExplosion(bullet.x, bullet.y, bullet.color, 3);
              shouldRemove = true;

              if (enemy.health <= 0) {
                soundSystem.playExplosion();
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 20);
                spawnPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                
                // Update score with combo
                setGameState(prev => {
                  const comboMultiplier = 1 + Math.floor(prev.combo / 10) * 0.1;
                  const points = Math.floor(enemy.scoreValue * comboMultiplier);
                  return { 
                    ...prev, 
                    score: prev.score + points,
                    combo: prev.combo + 1,
                    comboTimer: 180 // 3 seconds to maintain combo
                  };
                });
                setUiScore(prev => {
                  const state = gameState;
                  const comboMultiplier = 1 + Math.floor(state.combo / 10) * 0.1;
                  return prev + Math.floor(enemy.scoreValue * comboMultiplier);
                });
              }
              return false;
            }
            return true;
          });
        } else {
          // Enemy bullet hitting player
          if (playerRef.current && !playerRef.current.invincible && checkCollision(playerRef.current, bullet)) {
            soundSystem.playPlayerHit();
            playerRef.current.invincible = true;
            playerRef.current.invincibleTimer = 120;
            createExplosion(bullet.x, bullet.y, bullet.color, 10);
            shouldRemove = true;

            setGameState(prev => {
              const newLives = prev.lives - 1;
              if (newLives <= 0) {
                soundSystem.playGameOver();
                const newHighScore = Math.max(prev.score, prev.highScore);
                localStorage.setItem('shmup_highscore', newHighScore.toString());
                return { ...prev, lives: 0, isGameOver: true, highScore: newHighScore };
              }
              return { ...prev, lives: newLives };
            });
            setUiLives(prev => prev - 1);
          }
        }

        return !shouldRemove;
      });

      // Update and draw power-ups
      powerUpsRef.current = powerUpsRef.current.filter(powerUp => {
        powerUp.y += powerUp.vy;

        if (powerUp.y > CANVAS_HEIGHT) {
          return false;
        }

        // Draw power-up
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 
          powerUp.type === 'weapon' ? COLORS.powerupWeapon :
          powerUp.type === 'health' ? COLORS.powerupHealth :
          powerUp.type === 'shield' ? COLORS.powerupShield : COLORS.powerupBomb;
        ctx.fillStyle = ctx.shadowColor;
        
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = 
          powerUp.type === 'weapon' ? 'W' :
          powerUp.type === 'health' ? '+' :
          powerUp.type === 'shield' ? 'S' : 'B';
        ctx.fillText(icon, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
        
        ctx.restore();

        // Check collision with player
        if (playerRef.current && checkCollision(playerRef.current, powerUp)) {
          soundSystem.playPowerUp();
          
          if (powerUp.type === 'weapon') {
            playerRef.current.weaponLevel = Math.min(playerRef.current.weaponLevel + 1, 3);
          } else if (powerUp.type === 'health') {
            setGameState(prev => ({ ...prev, lives: Math.min(prev.lives + 1, 5) }));
            setUiLives(prev => Math.min(prev + 1, 5));
          } else if (powerUp.type === 'shield') {
            playerRef.current.invincible = true;
            playerRef.current.invincibleTimer = 600; // 10 seconds
          } else if (powerUp.type === 'bomb') {
            // Destroy all enemies on screen
            enemiesRef.current.forEach(enemy => {
              createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 15);
              soundSystem.playExplosion();
              setGameState(prev => ({ ...prev, score: prev.score + enemy.scoreValue }));
            });
            enemiesRef.current = [];
          }
          
          setUiScore(prev => prev + 50);
          return false;
        }

        return true;
      });

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        particle.vx *= 0.95;
        particle.vy *= 0.95;

        if (particle.life <= 0) {
          return false;
        }

        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Update combo timer
      setGameState(prev => {
        if (prev.comboTimer > 0) {
          return { ...prev, comboTimer: prev.comboTimer - 1 };
        } else if (prev.combo > 0) {
          setUiCombo(0);
          return { ...prev, combo: 0 };
        }
        return prev;
      });
      setUiCombo(gameState.combo);

      // Level progression
      if (frameCountRef.current % 600 === 0) { // Every 10 seconds
        setGameState(prev => ({ ...prev, level: prev.level + 1 }));
        setUiLevel(prev => prev + 1);
        enemySpawnRateRef.current = Math.max(20, enemySpawnRateRef.current - 5);
      }

      // Draw HUD
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${uiScore}`, 20, 30);
      ctx.fillText(`LIVES: ${'❤️'.repeat(uiLives)}`, 20, 60);
      ctx.fillText(`LEVEL: ${uiLevel}`, 20, 90);
      
      if (uiCombo > 5) {
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`COMBO x${uiCombo}!`, CANVAS_WIDTH / 2, 50);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver, spawnEnemy, createExplosion, spawnPowerUp]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-purple-500 rounded-lg shadow-2xl shadow-purple-500/50"
          style={{ maxWidth: '100%', height: 'auto' }}
        />

        {/* Start Screen */}
        {!gameState.isPlaying && !gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-magenta-500 to-yellow-400 mb-4 animate-pulse"
                style={{ textShadow: '0 0 20px #00ffff, 0 0 40px #ff00ff' }}>
              NEON BLASTER
            </h1>
            <p className="text-white text-xl mb-8">Un Shoot 'Em Up d'exception</p>
            
            <div className="bg-gray-800/90 p-6 rounded-lg mb-8 text-left">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">Contrôles</h2>
              <div className="text-white space-y-2">
                <p>⬆️⬇️⬅️➡️ ou ZQSD - Déplacement</p>
                <p>ESPACE - Tirer</p>
                <p>ÉCHAP - Pause</p>
              </div>
              
              <h2 className="text-2xl font-bold text-magenta-400 mt-6 mb-4">Power-Ups</h2>
              <div className="text-white space-y-2">
                <p><span className="text-green-400 font-bold">W</span> - Amélioration d'arme</p>
                <p><span className="text-pink-400 font-bold">+</span> - Vie supplémentaire</p>
                <p><span className="text-blue-400 font-bold">S</span> - Bouclier temporaire</p>
                <p><span className="text-orange-400 font-bold">B</span> - Bombe (détruie tout)</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-magenta-500 text-white text-2xl font-bold rounded-full hover:scale-110 transition-transform shadow-lg shadow-cyan-500/50"
            >
              COMMENCER
            </button>
            
            {gameState.highScore > 0 && (
              <p className="text-yellow-400 mt-4 text-lg">Meilleur Score: {gameState.highScore}</p>
            )}
          </div>
        )}

        {/* Pause Screen */}
        {gameState.isPaused && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
            <h2 className="text-5xl font-bold text-yellow-400 mb-8">PAUSE</h2>
            <button
              onClick={() => setGameState(prev => ({ ...prev, isPaused: false }))}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-2xl font-bold rounded-full hover:scale-110 transition-transform"
            >
              REPRENDRE
            </button>
            <p className="text-white mt-4">ou appuyez sur ÉCHAP</p>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
            <h2 className="text-6xl font-bold text-red-500 mb-4 animate-pulse">GAME OVER</h2>
            <p className="text-white text-3xl mb-2">Score Final: {uiScore}</p>
            {uiScore >= gameState.highScore && uiScore > 0 && (
              <p className="text-yellow-400 text-2xl mb-4 animate-bounce">🏆 NOUVEAU RECORD ! 🏆</p>
            )}
            <p className="text-gray-400 text-xl mb-8">Meilleur Score: {Math.max(uiScore, gameState.highScore)}</p>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-2xl font-bold rounded-full hover:scale-110 transition-transform shadow-lg shadow-red-500/50"
            >
              REJOUER
            </button>
            <p className="text-white mt-4">ou appuyez sur ENTRÉE</p>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="fixed bottom-4 left-4 md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div></div>
          <button
            className="w-16 h-16 bg-gray-700/80 rounded-full text-white text-2xl active:bg-gray-600"
            onTouchStart={() => keysRef.current['ArrowUp'] = true}
            onTouchEnd={() => keysRef.current['ArrowUp'] = false}
          >
            ⬆️
          </button>
          <div></div>
          <button
            className="w-16 h-16 bg-gray-700/80 rounded-full text-white text-2xl active:bg-gray-600"
            onTouchStart={() => keysRef.current['ArrowLeft'] = true}
            onTouchEnd={() => keysRef.current['ArrowLeft'] = false}
          >
            ⬅️
          </button>
          <button
            className="w-16 h-16 bg-gray-700/80 rounded-full text-white text-2xl active:bg-gray-600"
            onTouchStart={() => keysRef.current['ArrowDown'] = true}
            onTouchEnd={() => keysRef.current['ArrowDown'] = false}
          >
            ⬇️
          </button>
          <button
            className="w-16 h-16 bg-gray-700/80 rounded-full text-white text-2xl active:bg-gray-600"
            onTouchStart={() => keysRef.current['ArrowRight'] = true}
            onTouchEnd={() => keysRef.current['ArrowRight'] = false}
          >
            ➡️
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 md:hidden">
        <button
          className="w-20 h-20 bg-red-700/80 rounded-full text-white text-xl font-bold active:bg-red-600 shadow-lg"
          onTouchStart={() => keysRef.current['Space'] = true}
          onTouchEnd={() => keysRef.current['Space'] = false}
        >
          TIRER
        </button>
      </div>
    </div>
  );
};

export default App;
