let selectedPoint;

const points = []
let numPoints = -1

let dragging = false
let draggingStartPoint;
let offsetX = 0
let offsetY = 0

let scaleFactor = 1
let actualScale = 1

const showLine = true
var slider

function setup() {
	createCanvas(windowWidth, windowHeight);
	offsetX = width/2
	offsetY = height/2

	slider = createSlider(0, 8, 2, 1)
	slider.height = height/30
	slider.width = width/4
	slider.position(0, height - slider.height)
}

function refreshPoints() {
	points.length = 0
	for (let i = 0; i < numPoints + 2; i++) {
		points.push(randomPoint())
	}
}

function draw() {
	if (slider.value() != numPoints) {
		numPoints = slider.value()
		refreshPoints();
	}

	if (dragging) {
		translate(mouseX - draggingStartPoint.x, mouseY - draggingStartPoint.y) 
	}
		
	translate(offsetX, offsetY)
	
	actualScale += (scaleFactor - actualScale)/10
	scale(actualScale)
	
	
	if (selectedPoint) {
		selectedPoint.x = (mouseX - offsetX) / scaleFactor;
		selectedPoint.y = (mouseY - offsetY) / scaleFactor;
	}
	
	background(0);
	
	colorMode(RGB)
	stroke(50, 50, 50)
	strokeWeight(2)
	
	line(500000, 0, -500000, 0)
	line(0, 500000, 0, -500000)
	
	if (points.length > 0) {
		
		// Draw Line
		if (showLine) {
			colorMode(RGB)
			stroke(80, 80, 80)
			strokeWeight(2)
			
			for (let i = 0; i < points.length - 1; i++) {
				drawLine(points[i], points[i+1])
			}
		}
		
		// Draw Curve
		stroke(255);
		strokeWeight(2);
		let oldPoint = points[0]
		
		for (let n = 0; n <= 1; n += 0.01) {
			let bezierBuffer = [...points]
			for (let len = bezierBuffer.length; len > 1; len--) {
				for (let i = 0; i < len - 1; i++) {
					bezierBuffer[i] = pointLerp(bezierBuffer[i], bezierBuffer[i+1], n)
				}
			}
			
			let p = bezierBuffer[0]
			drawLine(oldPoint, p)
			oldPoint = p;
		}
		
		drawLine(oldPoint, points[points.length-1])
		
	}
	
	// Draw Points
	textSize(12)
	textAlign(CENTER, CENTER)
	let char = 65
	let hue = 0
	
	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		if (i == 0 || i == points.length - 1) {
			noStroke();
			colorMode(RGB)
			fill(255); ellipse(p.x, p.y, 20, 20);
			fill(0); text(String.fromCharCode(char++), p.x, p.y)
		} else {
			fill(0); 
			strokeWeight(2);
			colorMode(HSB)
			
			stroke(hue += 40, 50, 100); 
			ellipse(p.x, p.y, 20, 20);
			
			noStroke();
			fill(255); text(String.fromCharCode(char++), p.x, p.y)
		}
	}
	
}

function randomPoint() {
	return {x: random(-windowWidth/3, windowWidth/3), y: random(-windowHeight/3, windowHeight/3)}
}

function pointLerp(a, b, n) {
	return {
		x: a.x + (b.x - a.x) * n,
		y: a.y + (b.y - a.y) * n,
	}
}

function mousePressed() {
	if (mouseX > 0 && mouseX <= slider.width && mouseY < height && mouseY >= height - slider.height) {
		return;
	}
	
	for (let p of points) {
		if (((p.x)*scaleFactor - mouseX+offsetX) ** 2 + ((p.y)*scaleFactor - mouseY+offsetY) ** 2 < (20 * scaleFactor) ** 2) {
			selectedPoint = p;
			return;
		}
	}
	
	dragging = true
	draggingStartPoint = {x: mouseX, y: mouseY}
}

function mouseReleased() {
	selectedPoint = undefined;
	if (dragging) {
		dragging = false
		offsetX -= draggingStartPoint.x - mouseX
		offsetY -= draggingStartPoint.y - mouseY
	}
	
}

function mouseWheel(e) {
	let amount = -e.delta / 1000
	scaleFactor = min(max(scaleFactor + amount, 0.5), 2)
}

function drawLine(p1, p2) {
		line(p1.x, p1.y, p2.x, p2.y);
}