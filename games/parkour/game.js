// Note to viewer:
// I originally made this game when I was like 15 or so, I attempted to clean up the code a bit but gave up lmao

p5.disableFriendlyErrors = true;

function setup() {
	const canvas = createCanvas(1600, 600);
	canvas.position(
		(windowWidth - width) / 2, 
		(windowHeight - height) / 2
	);
	background(0);
	genMap()
}

var blocks = []

var distimer = 0
var distimer2 = 125

const TileType = {
	NORMAL: 0,
	GOAL: 1,
	ICE: 2,
	FIRE: 3,
	TRAMPOLINE: 4,
	CHECKPOINT: 5,
	FLASHING1: 6,
	FLASHING2: 7
}

var player = {
	x: 20,
	y: 400,
	dx: 0,
	dy: 0,
	grounded: 1,
	spawn: [20, 400],
	ice: 0,
	heat: 0,
	jump: 0
}

function draw() {
	distimer = (distimer + 1) % 251;
	distimer2 = (distimer2 + 1) % 251;

	// Respawn player
	if (player.y > 625 || player.heat > 127) {
		player.x = player.spawn[0]
		player.y = player.spawn[1]
		player.heat = 0
		player.dy = 2
		player.ice = 0
	}

	// Draw background
	fill(100)
	noStroke()
	rect(-1, -1, 2001, 601)

	// Draw Player
	fill(255, 255 - player.heat * 2, 255 - player.heat * 2)
	stroke(0)
	strokeWeight(2)
	rect(player.x - 8, player.y - 20, 16, 20)

	// Gravity
	player.dy += 0.1
	if (keyIsDown(40)) player.dy += 0.1

	// Friction
	if (player.ice == 0) player.dx *= 0.2
	if (player.ice == 1) player.dx *= 0.4
	if (player.ice == 2) player.dx *= 0.8

	// Terminal Velocity
	if (player.dy > 10) player.dy = 10

	// Left and Right movement
	if (keyIsDown(37)) {
		player.dx -= 2
		if (player.ice == 2) player.dx += 1.2
	}
	if (keyIsDown(39)) {
		player.dx += 2
		if (player.ice == 2) player.dx -= 1.2
	}

	// Heat Decay
	if (player.heat > 0) player.heat -= 0.5

	// Grounded
	player.grounded = 0
	if (player.ice == 2) player.ice = 1
	player.jump = 0

	// For each tile:
	for (let q = 0; q < 4; q++) {
		player.x += player.dx / 4
		player.y += player.dy / 4
		for (let i = 0; i < blocks.length; i++) {
			// Tile Color
			fill(50)
			if (blocks[i].mode == TileType.GOAL) fill(0, 255, 0)
			if (blocks[i].mode == TileType.ICE) fill(0, 255, 255)
			if (blocks[i].mode == TileType.FIRE) fill(255, 127, 0)
			if (blocks[i].mode == TileType.TRAMPOLINE) fill(255, 0, 255)
			if (blocks[i].mode == TileType.CHECKPOINT) {
				fill(0, 80, 0)
				if(sq(blocks[i].x-player.spawn[0])+sq(blocks[i].y-player.spawn[1])<2500) { // Within 50 units
					fill(0,160,0)
				}
			}
			if (blocks[i].mode === TileType.FLASHING1 || blocks[i].mode === TileType.FLASHING2) fill(200)
			
			// What the fuck
			stroke(0)
			strokeWeight(2)
			if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) rect(blocks[i].x - (blocks[i].dx / 2), blocks[i].y - (blocks[i].dy / 2), blocks[i].dx, blocks[i].dy)
			if (player.dy <= 0 && player.x + 6 > blocks[i].x - (blocks[i].dx / 2) && player.x - 6 < (blocks[i].x + (blocks[i].dx / 2)) && player.y > blocks[i].y + (blocks[i].dy / 2) && player.y < (blocks[i].y + (blocks[i].dy / 2)) + 20) {
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) player.dy = 0.5
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) player.y = blocks[i].y + (blocks[i].dy / 2) + 20
			}
			if (player.y > blocks[i].y - (blocks[i].dy / 2) + 2 && player.y < blocks[i].y + (blocks[i].dy / 2) + 18 && player.x > blocks[i].x - (blocks[i].dx / 2) - 8 && player.x < blocks[i].x - (blocks[i].dx / 2) + 8) {
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) player.dx = -0.1
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) player.x = blocks[i].x - (blocks[i].dx / 2) - 8
			}
			if (player.y > blocks[i].y - (blocks[i].dy / 2) + 2 && player.y < blocks[i].y + (blocks[i].dy / 2) + 18 && player.x > blocks[i].x + (blocks[i].dx / 2) - 8 && player.x < blocks[i].x + (blocks[i].dx / 2) + 8) {
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) player.dx = 0.1
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6)) player.x = blocks[i].x + (blocks[i].dx / 2) + 8
			}
			if (player.dy>=0 && player.x - 8 > blocks[i].x - (blocks[i].dx / 2) && player.x - 8 < (blocks[i].x - (blocks[i].dx / 2)) + blocks[i].dx && player.y > blocks[i].y - (blocks[i].dy / 2) && player.y < (blocks[i].y)) {
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6))  player.dy = 0.1
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6))  player.y = blocks[i].y - (blocks[i].dy / 2)
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6))  player.grounded = 1
				if (blocks[i].mode == 5 && sqrt(sq(player.x-player.spawn[0])+sq(player.y-player.spawn[0]))>50) {
					player.spawn[0] = blocks[i].x
					player.spawn[1] = blocks[i].y-25
				}
				if (blocks[i].mode == 4) {
					player.jump = 1
				}
				if (blocks[i].mode == 3) {
					player.heat += 1.5
				}
				player.ice = 0
				if (blocks[i].mode == 2) {
					player.ice = 2
				}
				if (blocks[i].mode == 1) {
					player.spawn = [20, 400]
					player.x = player.spawn[0]
					player.y = player.spawn[1]
					blocks = []
					genMap()
					return;
				}
			}
			if (player.dy>=0 && player.x + 8 > blocks[i].x - (blocks[i].dx / 2) && player.x + 8 < (blocks[i].x - (blocks[i].dx / 2)) + blocks[i].dx && player.y > blocks[i].y - (blocks[i].dy / 2) && player.y < (blocks[i].y)) {
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6))  player.dy = 0.1
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6))  player.y = blocks[i].y - (blocks[i].dy / 2)
				if((distimer<127 && blocks[i].mode==6) || (distimer2<127 && blocks[i].mode==7) || (blocks[i].mode!=7 && blocks[i].mode!=6))  player.grounded = 1
				if (blocks[i].mode == 5 && sqrt(sq(player.x-player.spawn[0])+sq(player.y-player.spawn[0]))>50) {
					player.spawn[0] = blocks[i].x
					player.spawn[1] = blocks[i].y-25
				}
				if (blocks[i].mode == 4) {
					player.jump = 1
				}
				if (blocks[i].mode == 3) {
					player.heat += 1.5
				}
				player.ice = 0
				if (blocks[i].mode == 2) {
					player.ice = 2
				}
				if (blocks[i].mode == 1) {
					player.spawn = [20, 400]
					player.x = player.spawn[0]
					player.y = player.spawn[1]
					blocks = []
					genMap()
					return;
				}
			}
		}
	}
}

function keyPressed() {
	if (player.grounded == 1) {
		if (keyCode == 38) {
			player.dy = player.jump === 1 ? -5 : -3
			player.grounded = false;
			return;
		}
	
		if (keyCode == 90) {
			player.dy = player.jump === 1 ? -5 : -3
			player.grounded = false;
			return;
		}
	}
}

function genMap() {
	player.spawn = [20, 400]
	let checkpoint = 0
	let mapmode = Math.floor(Math.random()*5)
	let x = 20
	let y = 450
	let ychange = [0, 20, 30, -20, -30]
	let xchange = [60, 80, 100, 120, 140]
	let changey
	let changex
	blocks.push({
					x: 20,
					y: 450,
					dx: 20,
					dy: 20,
					mode: 0
				})
	for (let i = 0; i < 100; i++) {
		if (y < 200) ychange = [0, -20, -30]
		if (y > 500) ychange = [0, 20, 30]
		changey = ychange[Math.floor(Math.random() * ychange.length)]
		changex = xchange[Math.floor(Math.random() * xchange.length)]
		x += changex
		y -= changey
		if(mapmode==0) y = 450
		ychange = [0, 20, 30, -20, -30]
		xchange = [60, 80, 100, 120, 140]
		if (x >= 700 && checkpoint == 0) {
			checkpoint = 1
			blocks.push({
				x: x,
				y: y,
				dx: 20,
				dy: 20,
				mode: 5
			})
			continue;
		}
		if (x >= 1450) {
			blocks.push({
				x: x,
				y: y,
				dx: 20,
				dy: 20,
				mode: 1
			})
			return;
		} else {
			
			let block = Math.random()
			if (block < 0.1 && i > 0) {
				blocks.push({
					x: x,
					y: y - 75,
					dx: 20,
					dy: 75,
					mode: 0
				})
			}
			if(Math.random()<0.2 && i>0 && changex<=130) {
				
					blocks.push({
						x: x,
						y: y,
						dx: 20,
						dy: 10,
						mode: 0
					})
					continue;
				
			}
			block = Math.random()
			if (block < 0.1) {
				blocks.push({
					x: x,
					y: y,
					dx: 20,
					dy: 20,
					mode: 2
				})
				ychange = [0, 20, 30, -20, -30]
				xchange = [100, 120, 140, 160, 180]
			} else {
				if (block < 0.2 && i > 0) {
					blocks.push({
						x: x,
						y: y,
						dx: 20,
						dy: 20,
						mode: 3
					})
					ychange = [0, 20, 30, -20, -30]
					xchange = [60, 80, 100, 120, 140]
				} else {
					if (block < 0.3) {
						blocks.push({
							x: x,
							y: y,
							dx: 20,
							dy: 20,
							mode: 4
						})
						ychange = [80, 110]
						xchange = [60, 80, 100, 120, 140]
					} else {
						if(block<0.4) {
							 blocks.push({
							x: x,
							y: y,
							dx: 20,
							dy: 20,
							mode: 6+i%2
						})
						ychange = [0, 20, 30, -20, -30]
						xchange = [60, 80, 100, 120, 140]
						} else {
						blocks.push({
							x: x,
							y: y,
							dx: 20,
							dy: 20,
							mode: 0
						})
						ychange = [0, 20, 30, -20, -30]
						xchange = [60, 80, 100, 120, 140]
						}
					}
				}
			}

		}
	}
}