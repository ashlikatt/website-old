function chooseWeighted(list) {
	let rng = Math.random() * list.reduce((a,b) => a + b[0], 0);
	for (let c = 0; c < list.length; c++) {
		const data = list[c];
		if (rng < data[0]) {
			return [c,data[1]];
		} else {
			rng -= data[0];
		}
	}
	return null; // Should be impossible
}

const items = {};
const images = {};
const sounds = {};
const projectiles = {};
const menuButtons = [];
var levels;

function getLevelData(level) {
	return levels[level];
}

function preload() {
	images.key = loadImage('assets/key.png');
	images.medkit = loadImage('assets/medkit.png');
	images.cake_speed = loadImage('assets/cake_speed.png');
	images.cake_health = loadImage('assets/cake_health.png');
	images.cake_damage = loadImage('assets/cake_damage.png');
	images.shield = loadImage('assets/shield.png');
	images.dagger = loadImage('assets/dagger.png');
	images.map = loadImage('assets/map.png');
	images.money = loadImage('assets/money.png');
	images.money_bundle = loadImage('assets/money_bundle.png');
	
	sounds.jump = new Audio('assets/jump.wav');
	sounds.grab = new Audio('assets/grab.wav');
	sounds.drop = new Audio('assets/drop.wav');
	sounds.use = new Audio('assets/use.wav');
	sounds.attack = new Audio('assets/attack.wav');
	sounds.hurt = new Audio('assets/hurt.wav');
	sounds.death = new Audio('assets/death.wav');
	sounds.splash = new Audio('assets/splash.wav');
	sounds.slice = new Audio('assets/slice.wav');
	sounds.bash = new Audio('assets/bash.wav');
}

function gameInit() {
	textFont('Courier New');
	items.key = new Item('key', "Key", 30, 8, "Required to unlock the exit door at the bottom of the map.");
	items.money = new Item('money', "Money", 30, 1, "Currency. (1)");
	items.money_bundle = new Item('money_bundle', "Money", 30, 5, "Currency. (5)");
	items.medkit = new Item('medkit', "Medkit", 40, 7, "Use: Heals a minor amount of HP.", undefined, function(holder) {
		if (holder.health < holder.maxHealth) {
			holder.health = Math.min(holder.maxHealth, holder.health + 10);
			holder.heldItem = undefined;
			sounds.use.play();
			for (let i = 0; i < 10; i++) 
				game.particles.push(particles.heal(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
		}
	});
	items.cake_speed = new Item('cake_speed', "Strawberry Cake", 35, 18, "Use: Permanently increases speed. Cursed.", undefined, function(holder) {
		if (holder instanceof Player) {
			holder.heldItem = undefined;
			holder.stat_speed += 0.15;
			holder.curse += 3;
			sounds.use.play();
			for (let i = 0; i < 10; i++) 
				game.particles.push(particles.heal(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
			for (let i = 0; i < 9; i++) 
				game.particles.push(particles.curse(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
		}
	});
	items.cake_health = new Item('cake_health', "Vanilla Cake", 35, 10, "Use: Permanently increases health. Cursed.", undefined, function(holder) {
		if (holder instanceof Player) {
			holder.heldItem = undefined;
			holder.maxHealth += 5;
			holder.health += 5;
			holder.curse+=1;
			sounds.use.play();
			for (let i = 0; i < 10; i++) 
				game.particles.push(particles.heal(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
			for (let i = 0; i < 3; i++) 
				game.particles.push(particles.curse(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
		}
	});
	items.cake_damage = new Item('cake_damage', "Chocolate Cake", 35, 14, "Use: Permanently increases damage. Cursed.", undefined, function(holder) {
		if (holder instanceof Player) {
			holder.heldItem = undefined;
			holder.stat_damage += 2;
			holder.curse+=2;
			sounds.use.play();
			for (let i = 0; i < 10; i++) 
				game.particles.push(particles.heal(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
			for (let i = 0; i < 6; i++) 
				game.particles.push(particles.curse(holder.x + Math.random() * holder.sizeX, holder.y + Math.random() * holder.sizeY));
		}
	});
	items.shield = new Item('shield', "Iron Shield", 45, 12, "Hold: Reduces incoming damage by 50%; Changes dash attack.", undefined, function(holder) {
		if (holder.canAttack) {
			if (holder instanceof Player) {
				const n = getHorizontalInput();
				if (n !== 0) {
					holder.hurtTime = 20;
					if (holder.jumpTime > 0) { // Grounded
						holder.attackCooldown = 60;
						holder.velX = n * 25 * holder.stat_dash_power;
						holder.velY = -1 * holder.stat_dash_power;
					} else {
						holder.attackCooldown = 75;
						holder.velX = n * 25 * holder.stat_dash_power;
						holder.velY *= 0.25 * holder.stat_dash_power;
					}
					game.particles.push(particles.ghost(holder.x, holder.y, holder.sizeX, holder.sizeY));
					sounds.bash.play();
				}
			} else {
				holder.hurtTime = 40;
				holder.attackCooldown = 140 + Math.random() * 100;
				let angle = atan2(game.player.centerY - holder.centerY, game.player.centerX - holder.centerX);
				holder.velX = cos(angle) * 28;
				holder.velY = sin(angle) * 6 - 0.5;
				game.particles.push(particles.ghost(holder.x, holder.y, holder.sizeX, holder.sizeY));
				sounds.bash.play();
			}
		}
	}, true);
	items.dagger = new Item('dagger', "Dagger", 35, 12, "Hold: Increases damage; changes dash attack.", undefined, function(holder) {
		if (holder.canAttack) {
			if (holder instanceof Player) {
				const n = holder.lastDirection;
				if (holder.jumpTime > 0) { // Grounded
					holder.attackCooldown = 15;
					holder.velY = -4 * holder.stat_dash_power;
				} else {
					holder.hurtTime = 15;
					holder.attackCooldown = 45;
					holder.velX = n * 16 * holder.stat_dash_power;
					holder.velY += 6 * holder.stat_dash_power;
					game.particles.push(particles.ghost(holder.x, holder.y, holder.sizeX, holder.sizeY));
				}
				sounds.slice.play();
			} else {
				if (holder.jumpTime > 0) { // Grounded
					holder.attackCooldown = 15 + Math.random() * 40;
					holder.hurtTime = 15;
					holder.velY = Math.random()*-2 - 2.5;
				} else {
					holder.attackCooldown = 70 + Math.random() * 70;
					holder.hurtTime = 20;
					let angle = atan2(game.player.centerY - holder.centerY, game.player.centerX - holder.centerX);
					holder.velX = cos(angle) * 24;
					holder.velY = sin(angle) * 4 + 4;
					game.particles.push(particles.ghost(holder.x, holder.y, holder.sizeX, holder.sizeY));
				}
				sounds.slice.play();
			}
		}
	}, true);
	items.map = new Item('map', "Map", 40, 8, "Hold: Shows floor layout.");
	
	levels = [
		{keys: 2, size:  4, force_theme: 0, guaranteed_items: ['cake_speed','key','medkit'],
		enemies: [[1,BasicEnemy]], priceMult: 1},
		{keys: 2, size:  5, guaranteed_items: ['key'],
		enemies: [[0.85,BasicEnemy],[0.15,WarriorEnemy]], priceMult: 1},
		{keys: 3, size:  5, guaranteed_items: ['cake_damage', 'map', 'key'],
		enemies: [[0.7,BasicEnemy],[0.3,WarriorEnemy]], priceMult: 1},
		{keys: 3, size:  6,
		enemies: [[0.6,BasicEnemy],[0.4,WarriorEnemy]], priceMult: 1.2},
		{keys: 4, size:  6,
		enemies: [[0.5,BasicEnemy],[0.5,WarriorEnemy]], priceMult: 1.4},
		{keys: 4, size:  7, guaranteed_items: ['cake_speed','cake_damage','cake_health'],
		enemies: [[0.5,BasicEnemy],[0.5,WarriorEnemy]], priceMult: 1.6},
		{keys: 5, size:  7,
		enemies: [[0.5,BasicEnemy],[0.5,WarriorEnemy]], priceMult: 1.8},
		{keys: 5, size:  8,
		enemies: [[0.5,BasicEnemy],[0.5,WarriorEnemy]], priceMult: 2}
		// Add infinite levels later, for now nobody will get here :)
	];
	
	menuButtons.push({x:100,sx:760,y:  108,sy:108,text:    "PLAY",callback:    clickPlayButton});
	menuButtons.push({x:100,sx:760,y:3*108,sy:108,text:"SETTINGS",callback:clickSettingsButton});
}


function clickPlayButton() {
	game.newGame();
}

function clickSettingsButton() {
	game.gameState = SETTINGS_STATE;
}



const PLAY_STATE = 1;
const LOSE_STATE = 2;
const PAUSE_STATE = 3;
const MENU_STATE = 4;
const SETTINGS_STATE = 5;

class Game {
	constructor() {
		this.gameState = MENU_STATE;
	}
	
	newGame() {
		this.gameState = PLAY_STATE;
		this.currentLevel = -1;
		this.transitionTimer = 60;
		this.particles = [];
		this.player = undefined;
		this.nextLevel();
		this.player = new Player(this.level.startRoom, this.level.startRoom.sizeX * 0.5, this.level.startRoom.sizeY - 30, 20, 30);
		this.shopkeeperAnger = 0;
	}
	
	nextLevel() {
		this.shopkeeperAnger = Math.max(0,this.shopkeeperAnger-1);
		this.currentLevel++;
		const ld = getLevelData(this.currentLevel);
		this.level = new Level(ld.size, ld.keys, this.currentLevel, ld.force_theme, ld.guaranteed_items);
		if (this.player) {
			this.player.room = this.level.startRoom;
			this.player.room.playerHasVisited = true;
			this.player.x = this.level.startRoom.sizeX * 0.5; 
			this.player.y = this.level.startRoom.sizeY - 30;
		}
		this.particles = [];
	}
	
	// noprotect
	render() {
		if (this.gameState === MENU_STATE) {
			background(0);
			stroke(100);
			strokeWeight(3);
			this.renderButtons();
		} else if (this.gameState === LOSE_STATE) {
			fill(0);
			noStroke();
			viewport.rect(0, 0, viewport.sizeX, viewport.sizeY);
			fill(127,0,0);
			textAlign(CENTER);
			viewport.text("You Lose!", viewport.sizeX/2 + 2, viewport.sizeY/2 - 35 + 2, 70);
			fill(255,0,0);
			viewport.text("You Lose!", viewport.sizeX/2, viewport.sizeY/2 - 35, 70);
			fill(0);
			noStroke();
			viewport.border();
		} else if (this.gameState === PLAY_STATE) {
			if (this.transitionTimer > 0) {
				fill(0);
				noStroke();
				viewport.rect(0, 0, viewport.sizeX, viewport.sizeY);
				viewport.border();
				this.transitionTimer --;
			} else {
				this.level.tick();
				this.renderGame();
			}
		}
	}
	
	renderButtons() {
		const mx = viewport.mouseX;
		const my = viewport.mouseY;
		textAlign(CENTER);
		strokeWeight(3);
		for (const b of this.buttons) {
			const hover = mx > b.x && mx < b.x+b.sx && my > b.y && my < b.y+b.sy;
			fill(hover ? 200 : 150); stroke(hover ? 120 : 70);
			viewport.rect(b.x, b.y, b.sx, b.sy);
			fill(255); stroke(0);
			viewport.text(b.text, b.x + b.sx/2, b.y+b.sy*0.7, b.sy*0.6);
		}
	}
	
	renderGame() {
		background(...this.level.theme.background);
		this.player.room.render(game.player.x + game.player.sizeX/2, game.player.y + game.player.sizeY/2 - game.player.sizeY*1.5, 6*96, 6*54);
		this.player.renderMap();
		this.player.renderTimer();
		if (this.player.heldItem) {
			fill(50);
			stroke(0);
			strokeWeight(3);
			viewport.rect(viewport.sizeX/40, viewport.sizeY * 35/40, viewport.sizeX/4, viewport.sizeY/10);
			viewport.image(this.player.heldItem.img, viewport.sizeX/40, viewport.sizeY * 35/40, viewport.sizeY/10, viewport.sizeY/10);
			textAlign(LEFT);
			fill(255);
			noStroke();
			const leftPos = viewport.sizeX*3/40 + viewport.sizeY/50;
			const hSize = viewport.sizeX/40 + viewport.sizeX/4 - leftPos;
			viewport.text(this.player.heldItem.safe_name, leftPos, viewport.sizeY * 71/80, viewport.sizeY/60, hSize);
			viewport.text(this.player.heldItem.description, leftPos, viewport.sizeY * 73/80, viewport.sizeY/60, hSize);
		}
		fill(0);
		noStroke();
		viewport.border();
		this.player.renderActions();
	}
	
	get buttons() {
		if (this.gameState === MENU_STATE) return menuButtons;
		else return [];
	}
}

const particles = {
	drip: (x, y, room) => {
		const size = Math.random() * 4 + 5;
		return { time: 999, x: x, y: y, sizeX: size/3, sizeY: size, room: room, dy: game.level.timeRemaining < 0 ? 12 : 5,
				render: (x, y, sx, sy, a) => {
					a.dy += 0.05;
					a.y += a.dy;
					fill(...game.level.theme.water);
					stroke(...game.level.theme.water_line);
					strokeWeight(1);
					viewport.rect(x, y, sx, sy);
					if (a.y + a.sizeY >= a.room.sizeY || a.y + a.sizeY >= a.room.getWaterLevel()) a.time = -1;
				}
		}
	},
	blood: (x, y) => {
		const time = 20 + Math.floor(Math.random()*10);
		return {time: time, x: x, y: y, sizeX: time/5, sizeY: time/5, dx: (Math.random()-0.5)*4, dy: -2 - Math.random()*3,
				render: (x, y, sx, sy, a) => {
					a.time --;
					a.dy += 0.1;
					a.x += a.dx + 0.1;
					a.y += a.dy + 0.1;
					a.sizeX -= 0.2;
					a.sizeY -= 0.2;
					fill(250,0,0);
					noStroke();
					viewport.rect(x, y, sx, sy);
				}
			};
	},
	heal: (x, y) => {
		const time = 20 + Math.floor(Math.random()*10);
		return {time: time, x: x, y: y, sizeX: 7.5, sizeY: 7.5,
				render: (x, y, sx, sy, a) => {
					a.time --;
					a.y -= a.time / 10;
					fill(0,255,0,250-time*8);
					noStroke();
					viewport.rect(x, y, sx, sy);
				}
			};
	},
	buff: (x, y) => {
		const time = 20 + Math.floor(Math.random()*10);
		return {time: time, x: x, y: y, sizeX: 5, sizeY: 7.5,
				render: (x, y, sx, sy, a) => {
					a.time --;
					a.y -= a.time / 10;
					fill(0,255,255,250-time*8);
					noStroke();
					viewport.rect(x, y, sx, sy);
				}
			};
	},
	curse: (x, y) => {
		const time = 40 + Math.floor(Math.random()*20);
		return {time: time, x: x, y: y, sizeX: 5, sizeY: 7.5,
				render: (x, y, sx, sy, a) => {
					a.time --;
					a.y -= a.time / 30;
					fill(150,0,200,250-time*4);
					noStroke();
					viewport.rect(x, y, sx, sy);
				}
			};
	},
	splash: (x, y, room) => {
		const size = Math.random() * 4 + 2;
		return { time: 999, x: x, y: Math.min(y, room.getWaterLevel()-size), sizeX: size, sizeY: size, room: room, dx: 3 * Math.random() - 1.5, dy: -3*Math.random(),
				render: (x, y, sx, sy, a) => {
					a.dy += 0.1;
					a.x += a.dx;
					a.y += a.dy;
					fill(...game.level.theme.water);
					stroke(...game.level.theme.water_line);
					strokeWeight(1);
					viewport.rect(x, y, sx, sy);
					if (a.y + a.sizeY > a.room.sizeY || a.y + a.sizeY > a.room.getWaterLevel()) a.time = -1;
				}
		}
	},
	ghost: (x, y, sx, sy) => {
		return { time: 20, x: x, y: y, sizeX: sx, sizeY: sy,
				render: (x, y, sx, sy, a) => {
					fill(0, 0, 0, a.time*6);
					noStroke();
					viewport.rect(x, y, sx, sy);
					a.time--;
				}
		}
	},
}

const themes = [
	{ main: [        20], main_stroke: [      5], background: [        40], water: [20,40,75,150], water_line: [ 0,20,50] }, // Gray
	{ main: [10, 20, 10], main_stroke: [0, 5, 0], background: [30, 40, 30], water: [20,60,75,150], water_line: [ 0,40,50] }, // Green
	{ main: [10, 20, 20], main_stroke: [0, 5, 5], background: [30, 40, 40], water: [20,60,95,150], water_line: [ 0,40,70] }, // Blue
	{ main: [20, 10, 10], main_stroke: [5, 0, 0], background: [40, 30, 30], water: [40,40,75,150], water_line: [20,20,50] }, // Red
]

class Level {
	constructor(size, keys, num, ft = undefined, gi = undefined) {
		this.levelNum = num;
		this.size = size;
		this.gridData = Array(size).fill(undefined).map(n => Array(size).fill(undefined)); // New NxN matrix
		this.timeRemaining = (size+2) * 30; // Columns * 30s + 60s
		this.timeRemaining *= 0.98 ** (game?.player?.curse || 0);
		this.requiredKeys = keys;
		this.usedKeys = 0;
		if (ft !== undefined) this.theme = themes[ft];
		else                  this.theme = themes[[1,2,3][Math.floor(Math.random() * 3)]];
		this.generate();
		this.placeObjects(gi || []);
		this.staticWaterLevel = Math.random()*3 + Math.random()*3 + Math.random()*3
	}
	
	getRoom(x, y) { return this.validRoom(x,y) ? this.gridData[x][y] : undefined; }
	getRoomUnchecked(x, y) { return this.gridData[x][y]; }
	validRoom(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
	rooms() {
		let rooms = [];
		for (let x = 0; x < this.size; x++) 
			for (let y = 0; y < this.size; y++) 
				rooms.push(this.getRoomUnchecked(x,y));
		return rooms;
	}
	roomLocs() {
		let rooms = [];
		for (let x = 0; x < this.size; x++) 
			for (let y = 0; y < this.size; y++) 
				rooms.push({x: x, y: y, room: this.getRoomUnchecked(x,y)});
		return rooms;
	}
	map(fn) {
		for (let x = 0; x < this.size; x++) 
			for (let y = 0; y < this.size; y++) 
				this.gridData[x][y] = fn(this.getRoomUnchecked(x,y),x,y);
		return this;
	} // Mutates!
	
	generate() {
		this.map(_ => new RoomPlan(false, false, undefined, undefined));
		
		// Generate the main path
		const startX = Math.floor(Math.random() * this.size);
		let curX = startX;
		let curY = 0;
		this.getRoomUnchecked(curX, curY).feature = "entrance";
		let dir = curX === 0 ? 1 : curX === this.size - 1 ? -1 : Math.random() < 0.5 ? 1 : -1;
		while (curY < this.size) {
			while (dir === 1 ? curX < this.size-1 : curX > 0) {
				this.getRoomUnchecked(curX, curY).connect( dir, 0);
				curX += dir;
				this.getRoomUnchecked(curX, curY).connect(-dir, 0);
				if (Math.random() < 0.4) break;
			}
			if (curY === this.size - 1) break;
			this.getRoomUnchecked(curX, curY).connect(0, 1);
			curY ++;
			this.getRoomUnchecked(curX, curY).connect(0, -1);
			dir = curX === 0 ? 1 : curX === this.size - 1 ? -1 : Math.random() < 0.5 ? 1 : -1;
		}
		this.getRoomUnchecked(curX, curY).feature = "exit";
		
		// Fill in gaps
		const unexplored = this.roomLocs().filter(n => n.room.unexplored);
		while (unexplored.length > 0) {
			const current = unexplored.pop();
			const dirs = [[1,0],[-1,0]];
			if (this.getRoom(current.x, current.y-1)?.canBeVertical) dirs.push([0, -1]);
			if (this.getRoom(current.x, current.y+1)?.canBeVertical) dirs.push([0,  1]);
			const adjacent = dirs.map(l => [l[0] + current.x, l[1] + current.y])
				.filter(n => this.validRoom(...n) && !this.getRoomUnchecked(...n).unexplored); 
			if (adjacent.length === 0) {
				unexplored.unshift(current);
			} else {
				const chosen = adjacent[Math.floor(Math.random() * adjacent.length)];
				const [ax, ay] = chosen;
				current.room.connect(ax-current.x, ay-current.y);
				this.getRoomUnchecked(...chosen).connect(current.x-ax, current.y-ay);
			}
		}
    
		// Add random connections
		const amnt = this.size * 2;
		for (let i = 0; i < amnt; i++) {
				const pos = [Math.floor(Math.random()*this.size), Math.floor(Math.random()*this.size)];
				const room = this.getRoomUnchecked(...pos);
				const dirs = [];
				if (!room.left)        dirs.push([-1, 0]         );
				if (!room.right)       dirs.push([ 1, 0]         );
				if (room.canBeVertical) {
						if (this.getRoom(pos[0], pos[1]-1)?.canBeVertical) dirs.push([0, -1]);
						if (this.getRoom(pos[0], pos[1]+1)?.canBeVertical) dirs.push([0,  1]);
				}
				const adjacent = dirs
					.map(l => [l[0] + pos[0], l[1] + pos[1]])
					.filter(n => this.validRoom(...n))
						.filter(l => l[1] === pos[1] || this.getRoomUnchecked(...l).canBeVertical); // Valid connections
				if (adjacent.length > 0) {
						const chosen = adjacent[Math.floor(Math.random() * adjacent.length)];
						const [rx, ry] = pos;
						const [ax, ay] = chosen;
						this.getRoomUnchecked(   ...pos).connect(ax-rx, ay-ry);
						this.getRoomUnchecked(...chosen).connect(rx-ax, ry-ay);
				}
		}
		
		// Place shop
		//if (this.levelNum > 0) {
			const candidates = this.rooms().filter(n => n.deadEnd && !n.hasVertical && !n.feature);
			if (candidates.length > 0) {
				const chosen = candidates[Math.floor(Math.random() * candidates.length)];
				chosen.feature = "shop";
			}
		//}
		
		this.map((n,x,y) => Room.fromPlan(n, this, x, y));
		this.startRoom = this.getRoom(startX, 0);
	}
	
	placeObjects(gi) {
		const deadEnds = this.rooms().filter(n => n.plan.deadEnd).sort((a,b) => 0.5 - Math.random());
		const halls = this.rooms().filter(n => !n.plan.deadEnd && n.plan.isHall).sort((a,b) => 0.5 - Math.random());
		const rest = this.rooms().filter(n => !n.plan.deadEnd && !n.plan.isHall).sort((a,b) => 0.5 - Math.random());
		const rooms = rest.concat(halls, deadEnds).filter(n => !n.flags.shop);
		const bonusItems = this.size;
		for (let i = 0; i < this.requiredKeys + gi.length + bonusItems; i++) {
			const room = rooms.pop();
			const item = i < gi.length ? items[gi[i]] 
			           : i - gi.length < this.requiredKeys ? items.key 
			           : randomNormalItem();
			let given = false;
			for (let e of room.enemies) {
				if (!e.heldItem) {
					e.heldItem = item;
					given = true;
					break;
				}
			}
			if (!given) {
				room.items.push(new GroundItem(Math.random() * room.sizeX/2 + room.sizeX/4, room.sizeY - item.size/2, room, item));
			}
		}
	}
	
	toString() {
		let s = "";
		for (let y = 0; y < this.size; y++) {
			for (let x = 0; x < this.size; x++) {
				s += this.getRoomUnchecked(x, y).toString() || "E"
			}
			s += "\n"
		}
		return s;
	}
	
	tick() {
		this.timeRemaining-=deltaTime/1000;
		const changeX = getHorizontalInput();
		if (changeX && game.player.stunTimer === 0) {
			game.player.lastDirection = Math.sign(changeX);
			let speed = game.player.stat_speed;
			if (game.player.room.enemies.length === 0 && buttonHeld('RUN')) {
				speed += 0.4;
			}
			game.player.addForce(changeX * speed, 0);
		}
		if (buttonHeld("DOWN")) game.player.addForce(0, 0.1);
		game.player.room.tickMovement();
		game.player.pickupCollectibles();
	}
}

class Room {
	constructor(level, x, y) {
		this.level = level;
		this.plan = undefined;
		this.x = x;
		this.y = y;
		this.enemies = [];
		this.connections = [];
		this.items = [];
		this.projectiles = [];
		this.sizeY = 300;
		this.sizeX = Math.floor(Math.random() * 600) + 600;
		this.geometry = [];
		this.background = [];
		this.flags = {};
		const bounds = 1000;
		this.geometry.push(new Geometry(this.sizeX,0,bounds,this.sizeY+bounds));
		this.geometry.push(new Geometry(0,-bounds,this.sizeX+bounds,bounds));
		this.geometry.push(new Geometry(-bounds,-bounds,bounds,this.sizeY+bounds));
		this.geometry.push(new Geometry(-bounds,this.sizeY,this.sizeX+bounds,bounds));
		this.water = new Water(this.getWaterLevel)
		this.playerHasVisited = false;
		this.mapDirs = [false, false, false, false];
		
		let px = 50+Math.random()*200;
		while (px < this.sizeX - 50) {
			this.background.push(new Geometry(px,0,10,this.sizeY,false));
			px += 50+Math.random()*200;
		} 
		
	}
	
	render(x, y, fovX, fovY) {
		for (let o of this.background.concat(this.connections, this.enemies, this.items, game.player, this.water, this.geometry)) {
			const px = (o.x-x) * viewport.sizeX / fovX;
			const py = (o.y-y) * viewport.sizeY / fovY;
			const sx = viewport.sizeX * o.sizeX / fovX;
			const sy = viewport.sizeY * o.sizeY / fovY;
			o.render(viewport.sizeX/2 + px, viewport.sizeY/2 + py, sx, sy);
		}
		for (let i = 0; i < game.particles.length; i++) {
			if (game.particles[i].time <= 0) {
				game.particles.splice(i,1);
				i--;
			} else {
				const px = (game.particles[i].x-x) * viewport.sizeX / fovX;
				const py = (game.particles[i].y-y) * viewport.sizeY / fovY;
				const sx = viewport.sizeX * game.particles[i].sizeX / fovX;
				const sy = viewport.sizeY * game.particles[i].sizeY / fovY;
				game.particles[i].render(viewport.sizeX/2 + px, viewport.sizeY/2 + py, sx, sy, game.particles[i]);
			}
		}
		for (let o of this.enemies.concat(game.player)) {
			if (o.aggressive) {
				const px = (o.x-x) * viewport.sizeX / fovX;
				const py = (o.y-y) * viewport.sizeY / fovY;
				const sx = viewport.sizeX * o.sizeX / fovX;
				const sy = viewport.sizeY * o.sizeY / fovY;
				o.renderBars(viewport.sizeX/2 + px, viewport.sizeY/2 + py, sx, sy);
			}
		}
	}
	
	getWaterLevel() {
		let level = (this.level.timeRemaining > 0) ?
			this.sizeY - 4 + 2*sin(this.level.timeRemaining/2) - this.level.staticWaterLevel :
		  this.sizeY - 4 + 2*sin(-1/3) + (this.level.timeRemaining)*3 - this.level.staticWaterLevel;
		
		if (this.flags.shop) level += 35;
		
		return level;
	}
	
	updateMapDirs() {
		this.mapDirs = [false, false, false, false];
		for (let c of this.connections) {
			this.mapDirs[dirIndex(c.dir)] = true;
		}
	}
	
	tickMovement() {
		const toMove = this.enemies.concat(game.player);
		const colliders = toMove.concat(this.geometry);
		toMove.forEach(n => n.tickMovement(colliders));
		this.items.forEach(n => n.tickMovement(this.geometry))
		
		this.water.y = this.getWaterLevel();
		
		let chance = 0.1;
		if (game.level.timeRemaining < 0) chance = 0.9;
		else if (game.level.timeRemaining < 5) chance = 0.65;
		else if (game.level.timeRemaining < 30) chance = 0.35;
		else if (game.level.timeRemaining < 60) chance = 0.2;
		if (Math.random() <= chance) {
			const size = Math.random() * 4 + 5;
			game.particles.push(particles.drip(Math.random() * this.sizeX, 0, this));
		}
	}
	
	static fromPlan(plan, level, x, y) {
		let r = new Room(level, x, y);
		r.plan = plan;
		if (plan.left) 
			r.connections.push(new Connection(30, r.sizeY - 50, 40, 50, DIR_LEFT, DOOR_NORMAL));
		if (plan.right) 
			r.connections.push(new Connection(r.sizeX - 70, r.sizeY - 50, 40, 50, DIR_RIGHT, DOOR_NORMAL));
		if (plan.hasVertical)
			r.connections.push(new Connection(r.sizeX/2 - 20, r.sizeY - 50, 40, 50, plan.vertical ? DIR_UP : DIR_DOWN, DOOR_NORMAL));
		if (plan.feature === "entrance") {
			r.flags.entrance = true;
			r.connections.push(new Connection(r.sizeX/2 - 30, r.sizeY - 70, 60, 70, DIR_UP, DOOR_ENTRANCE));
		} else if (plan.feature === "exit") {
			r.flags.exit = true;
			r.connections.push(new Connection(r.sizeX/2 - 30, r.sizeY - 70, 60, 70, DIR_DOWN, DOOR_EXIT));
			if (game?.shopkeeperAnger > 0) {
				const keeper = new ShopKeeper(r, r.sizeX/2 - 22.5/2, r.sizeY - 30, 22.5, 30, 100 * (1 + level.levelNum * 0.2), true);
				r.enemies.push(keeper);
			}
		} else if (plan.feature === "shop") {
			r.flags.shop = true;
			let keepPos = 0.1;
			let dir = 1;
			if (plan.left) {
				keepPos = 0.9;
				dir = -1;
			}
			keepPos *= r.sizeX;
			let options = [[2,'medkit'],[0.75,'cake_speed'],[1.25,'cake_health'],[1.25,'cake_damage'],[1,'map'],[1,'dagger'],[1,'shield'],[0.75,'key']];
			for (let o = 0; o < 3; o++) {
				let [index, name] = chooseWeighted(options);
				options.splice(index,1);
				const item = items[name];
				r.items.push(new GroundItem(keepPos + dir * 40 * (o+1.5) - item.size/2, r.sizeY - item.size, r, item, true));
			}
			const keeper = new ShopKeeper(r, keepPos - 22.5/2, r.sizeY - 30, 22.5, 30, 100 * (1 + level.levelNum * 0.2), false);
			r.enemies.push(keeper);
		} else {
			const positions = [0.33, 0.66]
			if (!plan.hasVertical) positions.push(0.5);
			for (let pos of positions) {
				if (Math.random() < Math.min(0.6, Math.max(0.2, y / level.size))) {
					const size = (25 + Math.floor(Math.random()*5) + Math.floor(Math.random()*5) * (1 + level.levelNum * 0.05));
					const enemy = new (randomEnemy(r.level.levelNum))(r, 0, 0, size*0.75, size, Math.floor(size/1.5) * (1 + level.levelNum * 0.2));
					enemy.x = r.sizeX * pos;
					enemy.y = r.sizeY - enemy.sizeY
					r.enemies.push(enemy);
				}
			}
		}
		r.updateMapDirs();
		return r;
	}
}

// Layout for room
class RoomPlan {
	constructor(left, right, vert, feature) {
		this.left = left;
		this.right = right;
		this.hasVertical = vert !== undefined;
		this.vertical = vert;
		this.feature = feature;
	}
	
	get deadEnd() {
		return this.left + this.right + this.hasVertical === 1;
	}
	
	get isHall() {
		return this.left && this.right && !this.hasVertical;
	}
	
	get canBeVertical() {
		return !this.hasVertical && this.feature !== "entrance" && this.feature !== "exit";
	}
	
	get unexplored() {
		return !(this.left || this.right || this.hasVertical);
	}
	
	connect(dx, dy) {
		if (dx ===  1 && dy === 0) this.right = true;
		if (dx === -1 && dy === 0) this.left = true;
		if (dx ===  0 && dy !== 0) {
			this.hasVertical = true;
			if (dy ===  1) this.vertical = false;
			if (dy === -1) this.vertical =  true;
		}
	}
	
	toString() {
		return " ╴╶─╵┘└┴╷┐┌┬"[(this.left ? 1 : 0) + (this.right ? 2 : 0) + (this.hasVertical ? (this.vertical ? 4 : 8) : 0)];
	}
}

class Collidable {
	constructor(x, y, sizeX, sizeY, h = true) {
		this.x = x;
		this.y = y;
		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.hasCollision = h;
	}
	
	collides(other) {
		if (!this.hasCollision || !other.hasCollision) return false;
		return this.intersects(other);
	}
	intersects(other) {
		return (this.left   <  other.right) && 
			     (this.right  >   other.left) &&
			     (this.top    < other.bottom) &&
			     (this.bottom >    other.top);
	}
	edgeCollides(other, top, bottom, left, right) {
		if (!this.hasCollision || !other.hasCollision) return false;
		const h = left && (this.right > other.left && this.right < other.right  ||  other.right > this.left && other.right <  this.right) ||
		          right && (this.left < other.right && this.left > other.left   ||   other.left < this.right && other.left >   this.left);
		const v = top && (this.bottom > other.top && this.bottom < other.bottom || other.bottom > this.top && other.bottom < this.bottom) ||
		          bottom && (this.top < other.bottom && this.top > other.top    ||    other.top < this.bottom && other.top >    this.top);
		return h && v;
	}
	
	get left() { return this.x }
	get right() { return this.x + this.sizeX; }
	get top() { return this.y; }
	get bottom() { return this.y + this.sizeY; }
	get centerX() { return this.x + this.sizeX / 2; }
	get centerY() { return this.y + this.sizeY / 2; }
	set left(v) { this.x = v; }
	set right(v) { this.x = v - this.sizeX; }
	set top(v) { this.y = v; }
	set bottom(v) { this.y = v - this.sizeY; }
	set centerX(v) { this.x = v - this.sizeX/2 }
	set centerY(v) { this.y = v - this.sizeY/2 }
	
	shifted(x, y) {
		return new Collidable(this.x + x, this.y + y, this.sizeX, this.sizeY);
	}
	
	hDist(other) {
		return Math.min(Math.abs(this.left - other.right), Math.abs(this.right - other.left))
	}
	
	vDist(other) {
		return Math.min(Math.abs(this.top - other.bottom), Math.abs(this.bottom - other.top))
	}
	
	moveChecked(dx, dy, colliders) {
		let moveH = dx;
		let moveV = dy;
		if (this.hasCollision) {
			for (let o of colliders.filter(m => m.hasCollision)) {
				if (moveH === 0 && moveV === 0) break; // Stop looking if we can't move
				if (this !== o) {
					let eventData = [0, 0]
					if (this.bottom > o.top && this.top < o.bottom) {
						if (moveH > 0) {
							if (this.right + moveH > o.left && this.left + moveH < o.right) {
								eventData[0] = 1;
								moveH = Math.min(moveH, o.left - this.right);
							}
						} else if (moveH < 0) {
							if (this.left + moveH < o.right && this.right + moveH > o.left) {
								eventData[0] = -1;
								moveH = Math.max(moveH, o.right - this.left);
							}
						}
					}
					if (this.right > o.left && this.left < o.right) {
						if (moveV > 0) {
							if (this.bottom + moveV > o.top && this.top + moveV < o.bottom) {
								eventData[1] = 1;
								moveV = Math.min(moveV, o.top - this.bottom);
							}
						} else if (moveV < 0) {
							if (this.top + moveV < o.bottom && this.bottom + moveV > o.top) {
								eventData[1] = -1;
								moveV = Math.max(moveV, o.bottom - this.top);
							}
						}
					}
					if (eventData[0] || eventData[1]) {
						this.onCollide(o, eventData, true);
						o.onCollide(this, [-eventData[0], -eventData[1]], false);
					}
				}
			}
		}
		this.x += moveH;
		this.y += moveV;
	}
	
	/*abstract*/onCollide(obj, dir, col) {}
	
}

class Mover extends Collidable {
	constructor(x, y, sx, sy, h = true) {
		super(x, y, sx, sy, h);
		this.velX = 0;
		this.velY = 0;
		this.mass = this.sizeX * this.sizeY / 30;
	}
	
	tickMovement(colliders) {
		if (this.inWater) {
			super.moveChecked(this.velX/2, this.velY/2, colliders);
			this.velX *= this.friction + (1-this.friction)/2;
			this.velY += this.gravity/2;
		} else {
			super.moveChecked(this.velX, this.velY, colliders);
			this.velX *= this.friction;
			this.velY += this.gravity;
		}
	}
	
	get friction() {
		return 0.7;
	}
	
	get gravity() {
		return 0.1;
	}
	
	addForce(x, y) {
		this.velX += x;
		this.velY += y;
	}
	
	get inWater() {
		return false;
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		if (obj instanceof Mover) {
			if (!col) return;
			const sum = this.mass+obj.mass;
			const massDif = this.mass - obj.mass;
			if (data[0]) 
				[this.velX, obj.velX] = [(this.velX *  massDif +  obj.velX * 2 *  obj.mass) / sum,
																 ( obj.velX * -massDif + this.velX * 2 * this.mass) / sum];
			if (data[1]) 
				[this.velY, obj.velY] = [(this.velY *  massDif +  obj.velY * 2 *  obj.mass) / sum,
																 ( obj.velY * -massDif + this.velY * 2 * this.mass) / sum];
		} else {
			if (data[0]) this.velX = 0;
			if (data[1]) this.velY = 0;
		}
	}
}

class ProjectileType {
	constructor(friction, gravity, damage, onHit) {
		this.friction = friction;
		this.gravity = gravity;
		this.damage = damage;
		this.onHit = onHit;
	}
}

class Projectile extends Mover {
	constructor(type, x, y, sx, sy) {
		super(x, y, sx, sy);
		this.type = type;
	}
	
	tickMovement(colliders) {
		super.tickMovement(colliders);
	}
	
	get friction() {
		return this.type.friction;
	}
	
	get gravity() {
		return this.type.gravity;
	}
	
	get inWater() {
		return false;
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		this.velX *= 1 - Math.abs(data[0]);
		this.velY *= 1 - Math.abs(data[1]);
	}
}

class Character extends Mover {
	constructor(room, x, y, sx, sy, health) {
		super(x, y, sx, sy, true);
		this.room = room;
		this.jumpTime = 0;
		this.hurtTime = 0;
		this.iFrames = 0;
		this.stunTimer = 0;
		this.maxHealth = health;
		this.health = health;
		this.breath = 100;
		this.heldItem = undefined;
		this.lastDirection = 1;
		this.underwater = true;
	}
	
	get aggressive() {
		return true;
	}
	
	moveChecked(dx, dy, colliders) {
		super.moveChecked(dx, dy, this.room.enemies.concat(this.room.geometry));
	}
	
	get damage() {
		return this.heldItem?.name === 'dagger' ? 3 : 0;
	}
	
	hurt(n, type=undefined) {
		if (this.iFrames <= 0) {
			if (type !== "drown") {
				if (this.heldItem?.name === "shield") n /= 2;
				this.iFrames = this.iFrameDuration
				sounds.hurt.play();
			}
			this.health -= n;
		}
	}
	
	get iFrameDuration() {
		return 40;
	}
	
	tickMovement(colliders) {
		super.tickMovement(colliders);
		if (this.jumpTime > 0) this.jumpTime --;
		if (this.hurtTime > 0) this.hurtTime --;
		if (this.iFrames > 0) this.iFrames --;
		if (this.stunTimer > 0) this.stunTimer --;
		if (this.y < this.room.getWaterLevel()) {
			this.breath = Math.min(100, this.breath+2);
		} else {
			this.breath = Math.max(0, this.breath-0.1);
			if (this.breath <= 0) {
				this.hurt(0.05, "drown");
			}
		}
		if (this.room.water) {
			if (this.underwater) {
				if (this.y + this.sizeY < this.room.water.y) {
					this.underwater = false;
				}
			} else {
				if (this.y + this.sizeY >= this.room.water.y) {
					this.underwater = true;
					sounds.splash.play();
					for (let i = 0; i < 10; i++) {
						game.particles.push(particles.splash(this.x + Math.random() * this.sizeX, this.y + this.sizeY, this.room));
					}
				}
			}
		}
	}
	
	get inWater() {
		return this.y >= this.room.getWaterLevel();
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		if (data[1] === 1) this.jumpTime = 2;
	}
	
	render(x, y, sx, sy) {}
	
	renderBars(x, y, sx, sy) {
		Character.drawHealthbar(x + sx/2, y + sy * 1.1, this.health, this.maxHealth);
		if (this.breath < 100) Character.drawBreathbar(x + sx/2, y + 5 + sy * 1.1, this.breath * this.maxHealth / 100, this.maxHealth);
	}
	
	static drawHealthbar(x, y, current, max) {
		const width = max;
		const start = x - width/2;
		noStroke();
		fill(255,0,0);
		viewport.rect(start, y, width, 5);
		fill(0,255,0);
		viewport.rect(start, y, Math.max(0, width * current / max), 5);
	}
	
	static drawBreathbar(x, y, current, max) {
		const width = max;
		const start = x - width/2;
		noStroke();
		fill(0,150,200);
		viewport.rect(start, y, width, 5);
		fill(0,200,255);
		viewport.rect(start, y, Math.max(0, width * current / max), 5);
	}
}

class Item {
	constructor(name, safe_name, size, price, d, wh=undefined, tb=undefined, eu = false) {
		this.name = name;
		this.safe_name = safe_name;
		this.img = images[name];
		this.size = size;
		this.whileHeld = wh;
		this.throwBehavior = tb;
		this.description = d;
		this.enemyUse = eu;
		this.price = price;
	}
	
	render(x, y, sx, sy, flip = 1) {
		if (flip === -1) {
			viewport.flip_image(this.img, x, y, sx, sy);
		} else {
			viewport.image(this.img, x, y, sx, sy);
		}
	}
}

class GroundItem extends Mover {
	constructor(x, y, room, item, shopItem = false) {
		super(x, y, item.size/2, item.size/2, true);
		this.item = item;
		this.room = room;
		this.groundTime = 0;
		this.pickupCooldown = 30;
		this.underwater = true;
		this.shopItem = shopItem;
		this.price = this.item.price * getLevelData(room.level.levelNum).priceMult;
	}
	
	tickMovement(colliders) {
		super.tickMovement(colliders);
		if (this.groundTime > 0) this.groundTime --;
		if (this.pickupCooldown > 0) this.pickupCooldown --;
		if (this.underwater) {
			if (this.y + this.sizeY < this.room.water.y) {
				this.underwater = false;
			}
		} else {
			if (this.y + this.sizeY >= this.room.water.y) {
				this.underwater = true;
				sounds.splash.play();
				for (let i = 0; i < 5; i++) {
					game.particles.push(particles.splash(this.x + Math.random() * this.sizeX, this.y + this.sizeY, this.room));
				}
			}
		}
	}
	
	get friction() {
		return this.groundTime > 0 ? 0.7 : 0.95;
	}
	
	render(x, y, sx, sy) {
		this.item.render(x, y - sin(frameCount/50) * 3, sx, sy);
		if (this.shopItem) {
			fill(255);
			stroke(255);
			strokeWeight(1);
			textAlign(CENTER);
			viewport.text(this.price, x + sx/2, y + sy - 50, 10);
			viewport.image(images.money_bundle, x + sx/2 - 10, y + sy - 70 - 10, 20, 20);
		}
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		if (data[1] === 1) this.groundTime = 2;
	}
}

const normal_items = [[3,'medkit'],[0.5,'cake_speed'],[1.25,'cake_health'],[1.25,'cake_damage'],[0.25,'map'],[0.1,'dagger'],[0.1,'shield'],[0.25,'key']];
function randomNormalItem() {
	return items[chooseWeighted(normal_items)[1]];
}

class Player extends Character {
	constructor(room, x, y, sx, sy) {
		super(room, x, y, sx, sy, 20);
		this.room.playerHasVisited = true;
		this.attackCooldown = 0;
		this.groundAttackCD = false;
		this.doorCooldown = 10;
		this.stat_iFrames = 60;
		this.stat_cooldownMult = 1;
		this.stat_damage = 5;
		this.stat_speed = 0.6;
		this.stat_jump = 3.5;
		this.stat_dash_power = 1;
		this.keys = 0;
		this.curse = 0;
		this.underwater = true;
		this.money = 0;
	}
	
	get damage() {
		return this.stat_damage + super.damage;
	}
	
	get iFrameDuration() {
		return this.stat_iFrames;
	}
	
	hurt(n, t=undefined) {
		super.hurt(n,t);
		if (this.health < 0) {
			sounds.death.play();
			game.gameState = LOSE_STATE;
		}
	}
	
	tickMovement(colliders) {
		super.tickMovement(colliders);
		if (this.attackCooldown > 0) this.attackCooldown = Math.max(this.attackCooldown - this.stat_cooldownMult, 0);
		if (this.doorCooldown > 0) this.doorCooldown --;
		if (this.heldItem && this.heldItem.whileHeld) this.heldItem.whileHeld(this);
		
		if (this.keys > 0 && game.level.usedKeys < game.level.requiredKeys) {
			const required = game.level.requiredKeys - game.level.usedKeys;
			const toUse = Math.min(required, this.keys);
			for (let c of this.room.connections) {
				if (c.type == DOOR_EXIT && this.intersects(c)) {
					game.level.usedKeys += toUse;
					this.keys -= toUse;
					sounds.use.play();
					break;
				}
			}
		}
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		if (obj instanceof Character) {
			if (this.hurtTime > 0) {
				obj.hurt(this.damage, "physical");
				if (data[0]) this.velX = Math.abs(this.velX) * data[0] * -5;
				if (data[1]) this.velY = Math.abs(this.velY) * data[1] * -1;
			}
		}
		if (data[1] === 1) this.groundAttackCD = false;
	}
	
	tryJump() {
		if (this.jumpTime > 0 && this.stunTimer === 0) {
			this.jumpTime = 0;
			this.velY = -this.stat_jump;
			sounds.jump.play();
		}
	}
	
	get canAttack() {
		return !this.groundAttackCD && this.attackCooldown === 0;
	}
	
	tryAttack() {
		if (this.canAttack) {
		 	if (buttonHeld("UP")) { // Uppercut attack
				this.hurtTime = 15;
				this.attackCooldown = 50;
				this.groundAttackCD = true;
				this.velY = -3 * this.stat_dash_power;
				this.velX = 0;
				sounds.attack.play();
				return;
			}
			const n = getHorizontalInput();
			if (n !== 0) {
				if (buttonHeld("DOWN") && this.jumpTime === 0) { // Dive attack
					this.hurtTime = 25;
					this.attackCooldown = 50;
					this.groundAttackCD = true;
					this.velX = n * 10 * this.stat_dash_power;
					this.velY = 4 * this.stat_dash_power;
					sounds.attack.play();
					return;
				} else { // Regular dash attack
					this.hurtTime = 15;
					this.groundAttackCD = true;
					if (this.jumpTime > 0) { // Grounded
						this.attackCooldown = 25;
						this.velX = n * 10 * this.stat_dash_power;
						this.velY = -2 * this.stat_dash_power;
					} else {
						this.attackCooldown = 40;
						this.velX = n * 15 * this.stat_dash_power;
						this.velY *= 0.5 * this.stat_dash_power;
					}
					sounds.attack.play();
					return;
				}
			}
		}
	}
	
	attemptEnterDoor() {
		if (this.jumpTime === 0 || this.stunTimer > 0) return;
		if (this.doorCooldown > 0) return;
		for (let c of this.room.connections.filter(n => !this.room.enemies.some(e => e.intersects(n)))) {
			if (c.type == DOOR_NORMAL && this.intersects(c)) {
				game.transitionTimer = 10;
				const newRoomX = this.room.x + c.dir[0];
				const newRoomY = this.room.y + c.dir[1];
				const newRoom = this.room.level.getRoom(newRoomX, newRoomY);
				this.room = newRoom;
				this.room.playerHasVisited = true;
				game.particles = [];
				for (let d of this.room.connections) {
					if (reverseDir(d.dir) === c.dir) {
						this.x = d.x + (d.sizeX-this.sizeX)/2;
						this.y = newRoom.sizeY - this.sizeY;
						this.doorCooldown = 40;
						break;
					}
				}
				break;
			}
			if (c.type == DOOR_EXIT && game.level.usedKeys >= game.level.requiredKeys && this.intersects(c)) {
				game.transitionTimer = 100;
				game.nextLevel();
				break;
			}
		}
	}
	
	dropItem() {
		if (this.stunTimer > 0) return;
		if (this.heldItem) {
			const gi = new GroundItem(this.x + this.sizeX/2 - this.heldItem.size/2 + this.lastDirection * this.sizeX/2, 
																this.y + this.sizeY/2 - this.heldItem.size/2, 
																this.room, this.heldItem);
			const changeX = getHorizontalInput();
			if (buttonHeld("DOWN") && this.jumpTime > 0) {
				this.heldItem = undefined;
				gi.velY = -0.8;
				gi.velX = this.lastDirection * 2;
				this.room.items.push(gi);
				sounds.drop.play();
			} else if (this.heldItem.throwBehavior) {
				this.heldItem.throwBehavior(this);
			} else if (changeX !== 0) {
				this.heldItem = undefined;
				gi.velY = -3;
				gi.velX = changeX * 12 * this.stat_speed;
				this.room.items.push(gi);
				sounds.drop.play();
			} else {
				this.heldItem = undefined;
				gi.velY = -2;
				gi.velX = this.lastDirection * 5;
				this.room.items.push(gi);
				sounds.drop.play();
			}
		}
	}
	
	attemptGrabItem() {
		if (this.stunTimer > 0) return;
		for (let i = 0; i < this.room.items.length; i++) {
			const c = this.room.items[i];
			if (c.pickupCooldown === 0 && this.intersects(c)) {
				if (c.shopItem) {
					if (this.money >= c.price) {
						this.money -= c.price;
						this.room.items.splice(i,1);
						if (c.item.name === 'money') {
							this.keys++;
						} else {
							this.heldItem = c.item;
						}
						sounds.grab.play();
						return true;
					}
				} else {
					if (c.item.name !== 'money' && c.item.name !== 'key' && c.item.name !== 'money_bundle') {
						this.room.items.splice(i,1);
						this.heldItem = c.item;
						sounds.grab.play();
						return true;
					}
				}
			}
		}
		return false;
	}
	
	pickupCollectibles() {
		if (this.stunTimer > 0) return;
		for (let i = 0; i < this.room.items.length; i++) {
			const c = this.room.items[i];
			if (!c.shopItem && c.pickupCooldown === 0 && this.intersects(c)) {
				if (c.item.name === 'key') {
					this.room.items.splice(i,1);
					this.keys++;
					sounds.grab.play();
					return;
				}
				if (c.item.name === 'money') {
					this.room.items.splice(i,1);
					this.money++;
					sounds.grab.play();
					return;
				}
				if (c.item.name === 'money_bundle') {
					this.room.items.splice(i,1);
					this.money+=5;
					sounds.grab.play();
					return;
				}
			}
		}
	}
	
	render(x, y, sx, sy) {
		let opacity = (this.iFrames > 0 && frameCount % 8 < 4) ? 175 : 255;
		if (this.hurtTime > 0) fill(255,0,0, opacity);
		else if (!this.canAttack) fill(200, opacity);
		else fill(255, opacity);
		stroke(0)
		strokeWeight(3);
		viewport.rect(x, y, sx, sy);
		if (this.heldItem !== undefined) {
			this.heldItem.render(x + sx/2 - this.heldItem.size/2 + this.lastDirection * sx/3, y + sy/2 - this.heldItem.size/2, this.heldItem.size, this.heldItem.size, this.lastDirection);
		}
		
	}
	
	renderActions() {
		fill(255);
		noStroke();
		textAlign(LEFT);
		const actions = [];
		if (this.room.enemies.length === 0) actions.push(["[SHIFT] : Run", [255,255,255]]);
		if (this.heldItem) {
			actions.push(["[X] : Use/Throw", [255,255,0]]) 
			if (this.jumpTime > 0) actions.push(["[X] + [DOWN] : Drop",[255,255,0]]) 
		}
		if (this.jumpTime > 0) {
			actions.push(["[Z] : Jump", [255]])
			let color = [0,255,255];
			for (let c of this.room.connections) {
				if ((c.type == DOOR_NORMAL || c.type == DOOR_EXIT && game.level.usedKeys >= game.level.requiredKeys) && this.intersects(c)) {
					let broken = false;
					for (let e of this.room.enemies) {
						if (e.intersects(c)) {
							color = [100];
							break;
						}
					}
					actions.push(["[UP] : Enter Door",color]);
					break;
				}
			}
		}
		
		let pickedUp = false;
		for (let i of this.room.items) {
			if (i.pickupCooldown === 0 && this.intersects(i)) {
				actions.push(["[X] : Pickup Item",[255,255,0]]) 
				pickedUp = true;
				break;
			}
		}
		
		if (!pickedUp) {
			if (!this.heldItem) {
				let color = this.canAttack ? [255] : [100];
				actions.push(["[X] : Attack",color]) 
				actions.push(["[X] + [UP] : Uppercut",color]) 
				if (this.jumpTime <= 0) actions.push(["[X] + [LEFT/RIGHT] + [DOWN] : Dive",color]) 
			}
		}
		
		let h = 0.02;
		noStroke();
		textAlign(RIGHT);
		for (let t of actions) {
			fill(...t[1]);
			viewport.text(t[0], viewport.sizeX * 0.98, viewport.sizeY * h, viewport.sizeY/60);
			h += 0.02;
		}
	}
	
	renderMap() {
		const fullMap = this.heldItem?.name === "map";
		const size = 20 - Math.log(game.level.size/5)*5;
		fill(200,200,170);
		stroke(180,180,150);
		strokeWeight(3);
		viewport.rect(10,10,size*game.level.size,size*game.level.size);
		noStroke();
		for (let x = 0; x < game.level.size; x++) {
			for (let y = 0; y < game.level.size; y++) {
				const room = game.level.getRoom(x, y);
				if (room.playerHasVisited || fullMap) {
					if (room.playerHasVisited) {
						fill(160,160,130);
						stroke(160,160,130);
						strokeWeight(1);
					} else {
						fill(180,180,150);
						stroke(180,180,150);
						strokeWeight(1);
					}
					const dirs = [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT];
					for (let i = 0; i < dirs.length; i++) {
						if (room.mapDirs[i]) {
							if (dirs[i] == DIR_UP || dirs[i] == DIR_DOWN) {
								viewport.rect(10 + size/3 + x*size, 10 + size/2 + y*size, size/3, (dirs[i][1]/2)*size)
							} else {
								viewport.rect(10 + size/2 + x*size, 10 + size/3 + y*size, (dirs[i][0]/2)*size, size/3)
							}
						}
					}
					if (room.playerHasVisited) {
						noStroke();
						if (room.flags.shop) {
							fill(140,100,50);
							viewport.rect(10 + size/6 + x*size, 10 + size/6 + y*size, size*4/6, size*4/6);
						} else {
							viewport.rect(10 + size/6 + x*size, 10 + size/6 + y*size, size*4/6, size*4/6);
							if (room.enemies.length > 0) {
								fill(255,0,0,50);
								viewport.rect(10 + size/6 + x*size, 10 + size/6 + y*size, size*4/6, size*4/6);
							}
						}
						if (this.room.x === x && this.room.y === y) {
							fill(120,220,120);
							viewport.rect(10 + size/3 + x*size, 10 + size/3 + y*size, size*1/3, size*1/3)
						}
						if (room.items.length > 0 || room.enemies.some(n => n.heldItem)) {
							fill(240,240,50);
							viewport.rect(10 + size*3/7 + x*size, 10 + size*3/7 + y*size, size*1/7, size*1/7)
						}
					} else {
						viewport.rect(10 + size/3 + x*size, 10 + size/3 + y*size, size/3, size/3);
					}
				}
			}
		}
		fill(255);
		stroke(255);
		strokeWeight(1);
		textAlign(LEFT);
		
		viewport.image(images.money_bundle, 5, 10 + size*game.level.size, 20, 20);
		viewport.text(this.money, 20, 30 + size*game.level.size, 15);
		
		viewport.image(images.key, 5, 30 + size*game.level.size, 20, 20);
		viewport.text(this.keys, 20, 50 + size*game.level.size, 15);
	}
		
	renderTimer() {
		noStroke();
		fill(0);
		viewport.rect(viewport.sizeX/2 - viewport.sizeX/15, viewport.sizeY/75, viewport.sizeX*2/15, viewport.sizeY/13);
		strokeWeight(3);
		textAlign(CENTER);
		textFont('Courier New');
		if (game.level.timeRemaining > 0) {
			let seconds = Math.ceil(game.level.timeRemaining);
			let minutes = Math.floor(seconds / 60);
			seconds = seconds % 60;
			seconds = (seconds+"").padStart(2, "0");
			minutes = (minutes+"").padStart(2, "0");
			fill(0,255,0);
			stroke(0,255,0);
			viewport.text(minutes + ":" + seconds, viewport.sizeX/2, viewport.sizeY/14, viewport.sizeY/14);
		} else if (game.level.timeRemaining > -2 ? frameCount % 20 > 10 : frameCount % 120 > 60) {
			fill(255,0,0);
			stroke(255,0,0);
			viewport.text("00:00", viewport.sizeX/2, viewport.sizeY/14, viewport.sizeY/14);
		}
	}
}

class Enemy extends Character {
	constructor(room, x, y, sx, sy, health) {
		super(room, x, y, sx, sy, health);
		this.attackCooldown = 140;
		this.underwater = true;
	}
	
	get moneyDrop() { return undefined; }
	
	pickupTick() {
		if (!this.heldItem) {
			for (let i = 0; i < this.room.items.length; i++) {
				const c = this.room.items[i];
				if (!c.shopItem && c.item.name !== 'money' && c.item.name !== 'money_bundle' && c.pickupCooldown === 0 && this.intersects(c)) {
					this.room.items.splice(i,1);
					this.heldItem = c.item;
					sounds.grab.play();
					return true;
				}
			}
		}
	}
	walkTick() {
		if (game.player.bottom < this.top && Math.random() < 0.1) this.tryJump();
		if (this.centerX < game.player.centerX) {
			this.addForce(this.speed + 0.1 * Math.random(),0);
			this.lastDirection = 1;
		} else {
			this.addForce(-this.speed - 0.1 * Math.random(),0);
			this.lastDirection = -1;
		}
		if (this.attackCooldown > 0) this.attackCooldown --;
		if (this.canAttack) this.tryAttack();
	}
	
	get speed() {
		return 0.1;
	}
	
	get iFrameDuration() {
		return 10;
	}
	
	hurt(n, t = undefined) {
		super.hurt(n, t);
		if (t !== "drown") this.attackCooldown *= 0.5;
		if (this.health < 0) this.death();
	}
	
	hurtCollider(obj, data) {
		if (obj instanceof Character) {
			if (this.hurtTime > 0 && obj instanceof Player) {
				obj.hurt(this.damage, "physical");
				if (data[0]) this.velX = Math.max(Math.abs(this.velX),4) * data[0] * -5;
				if (data[1]) this.velY = Math.max(Math.abs(this.velY),2) * data[1] * -1;
			}
		}
	}
	
	get canAttack() {
		return this.attackCooldown <= 0;
	}
	
	tryJump() {
		if (this.jumpTime > 0) {
			this.jumpTime = 0;
			this.velY = -2;
			sounds.jump.play();
		}
	}
	
	death() {
		if (this.heldItem) {
			const gi = new GroundItem(this.x + this.sizeX/2 - this.heldItem.size/2 + this.lastDirection * this.sizeX/2, 
																this.y + this.sizeY/2 - this.heldItem.size/2, 
																this.room, this.heldItem);
			gi.velX = Math.random() - 0.5;
			gi.velY = -1;
			this.heldItem = undefined;
			this.room.items.push(gi);
		}
		const deathItems = this.moneyDrop;
		if (deathItems) {
			for (let item of deathItems) {
				const gi = new GroundItem(this.x + this.sizeX/2 - item.size/2, 
																	this.y + this.sizeY/2 - item.size/2, 
																	this.room, item);
				gi.velX = (Math.random() - 0.5) * 4.5;
				gi.velY = -2 + Math.random() * -3;
				this.room.items.push(gi);
			}
		}
		sounds.death.play();
		for (let i = 0; i < 10; i++) 
			game.particles.push(particles.blood(this.x + Math.random() * this.sizeX, this.y + Math.random() * this.sizeY));
		for (let i = 0; i < this.room.enemies.length; i++) {
			if (this.room.enemies[i] === this) {
				this.room.enemies.splice(i,1);
			}
		}
	}
	
	tryAttack() {
		if (this.heldItem?.enemyUse) {
			this.heldItem.throwBehavior(this);
		} else {
			this.attackCooldown = 180 + Math.random() * 120;
			this.hurtTime = 20;
			let angle = atan2(game.player.centerY - this.centerY, game.player.centerX - this.centerX);
			this.velX = cos(angle) * 14.5;
			this.velY = sin(angle) * 3.5 - 1;
			sounds.attack.play();
		}
	}
	
	render(x, y, sx, sy) {}
}

class BasicEnemy extends Enemy {
	constructor(room, x, y, sx, sy, health) {
		super(room, x, y, sx, sy, health);
	}
	
	get damage() {
		return super.damage + 5;
	}
	
	get moneyDrop() {
		const rnd = Math.random()
		return rnd < 0.1 ? [] : rnd < 0.9 ? [items.money] : [items.money, items.money];
	}
	
	tickMovement(colliders) {
		super.tickMovement(colliders);
		if (this.stunTimer === 0) {
			super.pickupTick();
			super.walkTick();
		}
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		super.hurtCollider(obj, data);
	}
	
	render(x, y, sx, sy) {
		let opacity = (this.iFrames > 0 && frameCount % 8 < 4) ? 175 : 255;
		if (this.hurtTime > 0) fill(255,50,50, opacity);
		else if (this.attackCooldown > 60) fill(100,120,120, opacity);
		else fill(200,220,220, opacity);
		stroke(0)
		strokeWeight(3);
		viewport.rect(x, y, sx, sy);
		if (this.heldItem !== undefined) {
			this.heldItem.render(x + sx/2 - this.heldItem.size/2 + this.lastDirection * sx/3, y + sy/2 - this.heldItem.size/2, this.heldItem.size, this.heldItem.size, this.lastDirection);
		}
	}
}

function randomEnemy(f) {
	const data = getLevelData(f);
	let rnd = Math.random();
	for (let enemy of data.enemies) {
		if (rnd < enemy[0]) {
			return enemy[1];
		} else {
			rnd -= enemy[0]
		}
	}
	return null; // Should be impossible
}

class WarriorEnemy extends BasicEnemy {
	constructor(room, x, y, sx, sy, health) {
		super(room, x, y, sx*1.05, sy*1.05, health * 1.25);
		this.heldItem = Math.random() < 0.5 ? items.shield : items.dagger;
	}
	
	get speed() {
		return 0.135;
	}
	
	get moneyDrop() {
		const money = [];
		const amnt = 2 + Math.floor(Math.random() * 2);
		for (let i = 0; i < amnt; i++) {
			money.push(items.money);
		}
		return money;
	}
	
	render(x, y, sx, sy) {
		let opacity = (this.iFrames > 0 && frameCount % 8 < 4) ? 175 : 255;
		if (this.hurtTime > 0) fill(255,50,50, opacity);
		else if (this.attackCooldown > 60) fill(120,100,100, opacity);
		else fill(220,175,175, opacity);
		stroke(0)
		strokeWeight(3);
		viewport.rect(x, y, sx, sy);
		if (this.heldItem !== undefined) {
			this.heldItem.render(x + sx/2 - this.heldItem.size/2 + this.lastDirection * sx/3, y + sy/2 - this.heldItem.size/2, this.heldItem.size, this.heldItem.size, this.lastDirection);
		}
	}
}

class ShopKeeper extends Enemy {
	constructor(room, x, y, sx, sy, health, hasKey) {
		super(room, x, y, sx, sy, health);
		this.heldItem = Math.random() < 0.5 ? items.shield : items.dagger;
		this.takenDamage = false;
		this.hasKey = hasKey;
		if (this.aggressive) this.becomeAngry()
	}
	
	get damage() {
		return super.damage + 8;
	}
	
	becomeAngry() {
		for (let item of this.room.items) {
			item.shopItem = false;
		}
	}
	
	get aggressive() {
		return game?.shopkeeperAnger > 0;
	}
	
	hurt(n, t = undefined) {
		super.hurt(n, t);
		if (t !== "drown") {
			if (!this.takenDamage) {
				this.takenDamage = true;
				game.shopkeeperAnger += 2;
				this.becomeAngry();
			}
		} 
	}
	
	get speed() {
		return 0.15;
	}
	
	get moneyDrop() {
		const money = [];
		const amnt = 3 + Math.floor(Math.random() * 3);
		for (let i = 0; i < amnt; i++) {
			money.push(items.money_bundle);
		}
		if (this.hasKey) money.push(items.key);
		return money;
	}
	
	death() {
		super.death();
		game.shopkeeperAnger += 2;
	}
	
	tickMovement(colliders) {
		super.tickMovement(colliders);
		if (this.aggressive && this.stunTimer === 0) {
			super.pickupTick();
			super.walkTick();
			if (this.attackCooldown > 0) this.attackCooldown -= 0.25;
		}
	}
	
	onCollide(obj, data, col) {
		super.onCollide(obj, data, col);
		if (this.aggressive) super.hurtCollider(obj, data);
	}
	
	render(x, y, sx, sy) {
		let opacity = (this.iFrames > 0 && frameCount % 8 < 4) ? 175 : 255;
		if (this.hurtTime > 0) fill(255,50,50, opacity);
		else if (this.attackCooldown > 60) fill(80,175,80, opacity);
		else fill(80,240,80, opacity);
		stroke(0)
		strokeWeight(3);
		viewport.rect(x, y, sx, sy);
		if (this.aggressive && this.heldItem !== undefined) {
			this.heldItem.render(x + sx/2 - this.heldItem.size/2 + this.lastDirection * sx/3, y + sy/2 - this.heldItem.size/2, this.heldItem.size, this.heldItem.size, this.lastDirection);
		}
		if (this.hasKey) {
			items.key.render(x + sx/2 - items.key.size/2 - this.lastDirection * sx/3, y + sy/2 - items.key.size/2, items.key.size, items.key.size, this.lastDirection);
		}
	}
}

class Viewport {
	constructor(sx, sy, p, winX, winY) {
		this.sizeX = sx;
		this.sizeY = sy;
		this.padding = p;
		this.update(winX, winY);
	}
	
	update(winX, winY) {
		this.scale = Math.min(winX/this.sizeX, winY/this.sizeY) * (1 - this.padding)
		this.shiftX = (winX - this.sizeX * this.scale)/2;
		this.shiftY = (winY - this.sizeY * this.scale)/2;
	}
	
	transform(x, y, sx, sy) {
		return [this.shiftX + x * this.scale, this.shiftY + y * this.scale, sx * this.scale, sy * this.scale];
	}
	
	rect(x, y, sx, sy) {
		rect(...this.transform(x, y, sx, sy));
	}
	
	image(img, x, y, sx, sy) {
		image(img, ...this.transform(x, y, sx, sy));
	}
	flip_image(img, x, y, sx, sy) {
		push();
		[x, y, sx, sy] = this.transform(x, y, sx, sy);
		translate(x + sx, y);
		scale(-sx, sy);
		image(img, 0, 0, 1, 1);
		pop();
	}
	
	line(x, y, x2, y2) {
		line(this.shiftX +  x * this.scale,
				 this.shiftY +  y * this.scale,
				 this.shiftX + x2 * this.scale,
				 this.shiftY + y2 * this.scale);
	}
	text(txt, x, y, size, maxWidth=undefined) {
		const m = this.transform(x, y, size, size);
		textSize((m[2]+m[3])/2);
		if (maxWidth) text(txt, m[0], m[1], maxWidth * this.scale);
		else text(txt, m[0], m[1]);
	}
	
	border() {
		this.rect(0,0,10000,-10000);
		this.rect(this.sizeX,0,10000,10000);
		this.rect(this.sizeX,this.sizeY,-10000,10000);
		this.rect(0,this.sizeY,-10000,-10000);
	}
	
	get mouseX() {
		return (mouseX - this.shiftX) / this.scale;
	}
	
	get mouseY() {
		return (mouseY - this.shiftY) / this.scale;
	}
}

class Geometry extends Collidable {
	constructor(...m) {
		super(...m);
	}
	
	render(x, y, sx, sy) {
		fill(...game.level.theme.main);
		stroke(...game.level.theme.main_stroke)
		strokeWeight(3);
		viewport.rect(x, y, sx, sy);
	}
}

class Water extends Collidable {
	constructor(y) {
		super(-5000, y, 15000, 15000, false);
	}
	
	render(x, y, sx, sy) {
		fill(...game.level.theme.water);
		stroke(...game.level.theme.water_line)
		strokeWeight(3);
		viewport.rect(x, y, sx, sy);
	}
}

const DIR_UP    = [ 0, -1];
const DIR_DOWN  = [ 0,  1];
const DIR_LEFT  = [-1,  0];
const DIR_RIGHT = [ 1,  0];

const DOOR_NORMAL = 0;
const DOOR_ENTRANCE = 1;
const DOOR_EXIT = 2;
function reverseDir(dir) {
	if (dir === DIR_UP) return DIR_DOWN;
	if (dir === DIR_DOWN) return DIR_UP;
	if (dir === DIR_LEFT) return DIR_RIGHT;
	return DIR_LEFT;
}
function dirIndex(dir) {
	if (dir === DIR_UP) return 0;
	if (dir === DIR_DOWN) return 1;
	if (dir === DIR_LEFT) return 2;
	return 3;
}

class Connection extends Collidable {
	constructor(x, y, sx, sy, dir, type) {
		super(x, y, sx, sy, false);
		this.dir = dir;
		this.type = type;
	}
	
	render(x, y, sx, sy) {
		if (this.type == DOOR_ENTRANCE) {
			fill(70,60,50);
			stroke(0);
			strokeWeight(3);
			viewport.rect(x, y, sx/2, sy);
			viewport.rect(x+sx/2, y, sx/2, sy);
		} else if (this.type == DOOR_EXIT) {
			if (game.level.usedKeys === game.level.requiredKeys) {
				fill(0);
				stroke(0);
				strokeWeight(3);
				viewport.rect(x, y, sx, sy);
				fill(70,60,50);
				viewport.rect(x, y, sx/3, sy);
				viewport.rect(x + sx*2/3, y, sx/3, sy);
			} else {
				fill(70,60,50);
				stroke(0);
				strokeWeight(3);
				viewport.rect(x, y, sx/2, sy);
				viewport.rect(x+sx/2, y, sx/2, sy);
				for (let i = 0; i < game.level.requiredKeys; i++) {
					if (i < game.level.usedKeys) fill(240,230,20);
					else fill(40,30,20);
					noStroke();
					viewport.rect(x + sx/10, y + sy/10 + i * sy/(game.level.requiredKeys+1), sx*3/10, sy/(game.level.requiredKeys+2));
				}
			}
		} else {
			fill(0);
			stroke(0);
			strokeWeight(3);
			viewport.rect(x, y, sx, sy);
			
			stroke(30);
			strokeWeight(5);
			if (this.dir === DIR_UP) {
				viewport.line(x + sx/2, y + sy/3, x + sx/2, y + sy*2/3);
				viewport.line(x + sx/2, y + sy/3, x + sx/3, y + sy/2);
				viewport.line(x + sx/2, y + sy/3, x + sx*2/3, y + sy/2);
			} else if (this.dir === DIR_DOWN) {
				viewport.line(x + sx/2, y + sy/3, x + sx/2, y + sy*2/3);
				viewport.line(x + sx/2, y + sy*2/3, x + sx/3, y + sy/2);
				viewport.line(x + sx/2, y + sy*2/3, x + sx*2/3, y + sy/2);
			}
		}
	}
}

p5.disableFriendlyErrors = true;




function setup() {
	createCanvas(windowWidth, windowHeight);
	viewport = new Viewport(960, 540, 0.05, width, height);
	
	gameInit();
	this.game = new Game();
	
	noSmooth();
}

var game;
var viewport;

function draw() {
	game.render();
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight)
	viewport.update(width, height);
}

const heldInputs = {};
const inputMap = {
	37: "LEFT",
	38: "UP",
	39: "RIGHT",
	40: "DOWN",
	90: "JUMP",
	88: "ATTACK",
	16: "RUN"
}

function keyPressed() {
	if (inputMap[keyCode]) {
		heldInputs[inputMap[keyCode]] = true;
		hitButton(inputMap[keyCode]);
	}
}

function keyReleased() {
	if (inputMap[keyCode]) {
		heldInputs[inputMap[keyCode]]= false;
	}
}

function buttonHeld(name) {
	return heldInputs[name] ?? false;
}

function hitButton(name) {
	if (name === "JUMP") game.player.tryJump();
	if (name === "ATTACK") {
		if (game.player.heldItem) {
			game.player.dropItem();
			return;
		}
		if (game.player.attemptGrabItem()) return;
		game.player.tryAttack();
	}
	if (name === "UP") game.player.attemptEnterDoor();
}

const getHorizontalInput=()=>buttonHeld("RIGHT")-buttonHeld("LEFT");

function mousePressed() {
	const mx = viewport.mouseX;
	const my = viewport.mouseY;
	for (const b of game.buttons) {
		if (mx > b.x && mx < b.x+b.sx && my > b.y && my < b.y+b.sy) {
			b.callback();
			return;
		}
	}
}








