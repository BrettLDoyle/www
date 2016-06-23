//Yay, a 3d renderer!

/*
TODO:
Collect polygon info (vectors), then render to pixels later with opacity, anti-aliasing, etc
Sort by Z-depth
Anti alias
Opacity
Reflections (!), create frustum of polygon shape, extending along the reflected line of sight, collect polygons/lights in area, and render them when polygon is rendered
Shadows (!), create frustum(s) of polygon shape, extending along each light direction, collect polygons in area, and render those polygons as shadow when polygon is rendered
Normals, use angle away from light sources to affect shading
other stuff


*/


var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var width = canvas.width;
var height = canvas.height;
var objects = [];
var keys = [];

var renderInfo = []; //used to store polygon data before actually drawing the scene

canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;

document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
//document.exitPointerLock();

canvas.onclick = function() {
	canvas.requestPointerLock();
}

document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
	if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas) {
		document.addEventListener("mousemove", rotateCam, false);
	} else {
		document.removeEventListener("mousemove", rotateCam, false);
	}
}

function sortNum(a, b) {
	return a - b;
}

function getBounds(arr) {
	var newArr = [];
	arr.sort(sortNum);
	newArr.push(arr[0]);
	newArr.push(arr[arr.length - 1]);
	return newArr;
}

function drawLine(line, image) {
	line[0].x = ~~line[0].x;
	line[0].y = ~~line[0].y;
	line[1].x = ~~line[1].x;
	line[1].y = ~~line[1].y;
	
	var xDist = Math.abs(line[0].x - line[1].x);
	var yDist = Math.abs(line[0].y - line[1].y);
	if (xDist >= yDist) {
		//draw along x axis
		if (line[0].x > line[1].x) {
			line.reverse();
		}
		for (var i = 0; i < xDist; i++) {
			var fraction = i/xDist;
			var x = line[0].x + i;
			var y = (line[0].y * (1 - fraction)) + (line[1].y * fraction);
			image.data[4 * (x + y * width) + 0] = 0;
			image.data[4 * (x + y * width) + 1] = 0;
			image.data[4 * (x + y * width) + 2] = 0;
			image.data[4 * (x + y * width) + 3] = 255;
		}
	} else {
		//draw along y axis
		if (line[0].y > line[1].y) {
			line.reverse();
		}
		for (var i = 0; i < yDist; i++) {
			var fraction = i/yDist;
			var x = (line[0].x * (1 - fraction)) + (line[1].x * fraction);
			var y = line[0].y + i;
			image.data[4 * (x + y * width) + 0] = 0;
			image.data[4 * (x + y * width) + 1] = 0;
			image.data[4 * (x + y * width) + 2] = 0;
			image.data[4 * (x + y * width) + 3] = 255;
		}
	}
	return image;
}

function boundTo(amount, min, max) {
	//used to make rotation values not go above 360
	if (amount > max) {
		amount -= max;
		if (amount > max) {
			return boundTo(amount, min, max);
		} else {
			return amount;
		}
	} else if (amount < min) {
		amount += max;
		if (amount < min) {
			return boundTo(amount, min, max);
		} else {
			return amount;
		}
	} else {
		return amount;
	}
}

function toRad(degree) {
	return degree * Math.PI / 180.0;
}

function crossProduct(a, b) {
	var c = new vector([a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x]);
	return c.normalize();
}

function getNormal(verts) {
	var newVerts = [];
	for (var i = 0; i < verts.length; i++) {
		newVerts.push(verts[i]);
	}
	newVerts.push(verts[0]);
	newVerts.push(verts[1]);
	var vertNormals = [];
	for (var i = 1; i < newVerts.length - 1; i++) {
		var vec1 = {x: newVerts[i].x - newVerts[i - 1].x, y: newVerts[i].y - newVerts[i - 1].y, z: newVerts[i].z - newVerts[i - 1].z};
		var vec2 = {x: newVerts[i + 1].x - newVerts[i].x, y: newVerts[i + 1].y - newVerts[i].y, z: newVerts[i + 1].z - newVerts[i].z};
		vertNormals.push(crossProduct(vec1, vec2));
	}
	var normal = new vector([0, 0, 0]);
	for (var i = 0; i < vertNormals.length; i++) {
		normal.x += vertNormals[i].x;
		normal.y += vertNormals[i].y;
		normal.z += vertNormals[i].z;
	}
	return normal.normalize();
}

function vector(position) {
	this.x = position[0];
	this.y = position[1];
	this.z = position[2];
	this.rotate = function(angle, axis) {
		angle = toRad(angle);
		if (angle == 0) {
			return this;
		}
		var newPoint = new vector([this.x, this.y, this.z]);
		
		if (axis == 0) {
			newPoint.y = (this.y * Math.cos(angle)) - (this.z * Math.sin(angle));
			newPoint.z = (this.y * Math.sin(angle)) + (this.z * Math.cos(angle))
			return newPoint;
		} else if (axis == 1) {
			newPoint.x = (this.x * Math.cos(angle)) - (this.z * Math.sin(angle));
			newPoint.z = (this.z * Math.cos(angle)) - (this.x * Math.sin(angle));
			return newPoint;
		} else if (axis == 2) {
			newPoint.x = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
			newPoint.y = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));
			return newPoint;
		} else {
			return false;
		}
	}
	this.move = function(displacement) {
		return new vector([this.x + displacement.x, this.y + displacement.y, this.z + displacement.z]);
	}
	this.scale = function(amount) {
		return new vector([this.x * amount, this.y * amount, this.z * amount]);
	}
	this.normalize = function() {
		var length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
		return new vector([this.x / length, this.y / length, this.z / length]);
	}
}

function object(vertices) {
	this.vertices = vertices;
	this.lines = [];
	this.polygons = [];
	this.move = function(displacement) {
		for (var i = 0; i < this.vertices.length; i++) {
			this.vertices[i] = this.vertices[i].move(displacement);
		}
	}
	this.rotate = function(rotation) {
		for (var i = 0; i < this.vertices.length; i++) {
			this.vertices[i] = this.vertices[i].rotate(rotation);
		}
	}
	this.scale = function(amount) {
		for (var i = 0; i < this.vertices.length; i++) {
			this.vertices[i] = this.vertices[i].scale(amount);
		}
	}
}

function camera(position) {
	this.position = {x: position[0], y: position[1], z: position[2]};
	this.rotation = {x: 0, y: 0, z: 0};
	this.fov = 45;
	this.move = function(displacement) {
		this.position.x += displacement.x;
		this.position.y += displacement.y;
		this.position.z += displacement.z;
	}
	this.rotate = function(rotation) {
		//this.rotation.x += rotation[0];
		//this.rotation.y += rotation[1];
		//this.rotation.z += rotation[2];
		this.rotation.x = boundTo(this.rotation.x + rotation[0], 0, 360);
		this.rotation.y = boundTo(this.rotation.y + rotation[1], 0, 360);
		this.rotation.z = boundTo(this.rotation.z + rotation[2], 0, 360);
	}
}

function worldToScreen(point, camera) {
	//console.log('Starting thing');
	//console.log(point.x, point.y, point.z);
	//console.log('Removing camera position:');
	
	var newPoint = new vector([point.x - camera.position.x, point.y - camera.position.y, point.z - camera.position.z]);
	
	//console.log(newPoint.x, newPoint.y, newPoint.z);
	//console.log('Removing camera rotation:');
	//console.log('#');
	newPoint = newPoint.rotate(camera.rotation.z * -1, 2);
	newPoint = newPoint.rotate(camera.rotation.y * -1, 1);
	newPoint = newPoint.rotate(camera.rotation.x * -1, 0);
	if (newPoint.z > 0) {
		return false;
	}
	
	var screenWidth = 2 * Math.tan(toRad(camera.fov) / 2);
	var screenHeight = screenWidth * (height/width);
	
	x = newPoint.x/(newPoint.z + 1) + screenWidth / 2;
	y = newPoint.y/(newPoint.z + 1) + screenHeight / 2;
	
	x = x * (width/screenWidth);
	y = y * (height/screenHeight);
	
	x = ~~x;
	y = ~~y;
	return {x: x, y: y};
}

var cam = new camera([50, 50, 50]);
cam.rotation.x = 54;
cam.rotation.z = 135;
var oldMouse = false;

function render() {
	renderInfo = [];
	
	
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, width, height);
	var pixels = ctx.createImageData(width, height);
	for (var i = 0; i < objects.length; i++) {
		//render each line of the object
		var obj = objects[i];
		for (var j = 0; j < obj.polygons.length; j++) {
			
			//get polygon vertices
			var verts = [];
			var allFine = true;
			for (var k = 0; k < obj.polygons[j].length; k++) {
				verts.push(obj.vertices[obj.polygons[j][k]]);
				var test = worldToScreen(obj.vertices[obj.polygons[j][k]], cam);
				if (!test) {
					allFine = false;
				}
			}
			var normal = getNormal(verts);
			normal = normal.rotate(cam.rotation.z, 2);
			normal = normal.rotate(cam.rotation.y, 1);
			normal = normal.rotate(cam.rotation.x, 0);
			
			if (normal.z < 0 && allFine) {
				//console.log('Pointing away!');
			} else {
				var points = [];
				for (var k = 0; k < obj.polygons[j].length; k++) {
					points.push(worldToScreen(obj.vertices[obj.polygons[j][k]], cam));
				}
				//get polygon lines
				var edgePixels = [];
				points.push(points[0]);
				for (var k = 0; k < points.length - 1; k++) {
					var line = [points[k], points[k + 1]];
					var xDist = Math.abs(line[0].x - line[1].x);
					var yDist = Math.abs(line[0].y - line[1].y);
					if (xDist > yDist) {
						//fill in line along x axis
						if (line[0].x > line[1].x) {
							//ensure that the first point in the line is before the second along the x axis
							line.reverse();
						}
						//line[1].y = line[1].y - line[0].y;
						for (var o = 0; o < xDist; o++) {
							var fraction = o/xDist;
							var x = line[0].x + o;
							var y = line[0].y + fraction * (line[1].y - line[0].y);
							//var y = (line[0].y * (1.0 - fraction)) + (line[1].y * fraction);
							y = ~~y;
							if (!x < 0 && !x > width) {
								if (!edgePixels[x]) {
									edgePixels[x] = [];
								}
								edgePixels[x].push(y);
								//pixels.data[4 * (x + y * width) + 0] = 0;
								//pixels.data[4 * (x + y * width) + 1] = 0;
								pixels.data[4 * (x + y * width) + 2] = 255;
								pixels.data[4 * (x + y * width) + 3] = 255;
							}
						}
					} else {
						//fill in line along y axis
						if (line[0].y > line[1].y) {
							//ensure that the first point in the line is before the second along the y axis
							line.reverse();
						}
						//line[1].x = line[1].x - line[0].x;
						for (var o = 0; o < yDist; o++) {
							var fraction = o/yDist;
							var x = line[0].x + fraction * (line[1].x - line[0].x);
							//var x = (line[0].x * (1.0 - fraction)) + (line[1].x * fraction);
							x = ~~x;
							var y = line[0].y + o;
							if (!edgePixels[x]) {
								edgePixels[x] = [];
							}
							edgePixels[x].push(y);
							//pixels.data[4 * (x + y * width) + 0] = 0;
							//pixels.data[4 * (x + y * width) + 1] = 0;
							pixels.data[4 * (x + y * width) + 2] = 255;
							pixels.data[4 * (x + y * width) + 3] = 255;
						}
					}
				}
				//now fill in everything inside the edgepixels
				var columns = [];
				for (var x = 0; x < edgePixels.length; x++) {
					if (edgePixels[x]) {
						if (edgePixels[x].length >= 2) {
							edgePixels[x] = getBounds(edgePixels[x]);
							columns.push(x);
						}
					}
				}
				
				for (var k = 0; k < columns.length; k++) {
					var x = columns[k];
					var yBounds = edgePixels[x];
					for (var y = yBounds[0]; y <= yBounds[1]; y++) {
						//pixels.data[4 * (x + y * width) + 0] = 0;
						pixels.data[4 * (x + y * width) + 1] = 255;
						//pixels.data[4 * (x + y * width) + 2] = 0;
						pixels.data[4 * (x + y * width) + 3] = 255;
					}
				}
			}
		}
		for (var j = 0; j < obj.vertices.length; j++) {
			var screenPoint = worldToScreen(obj.vertices[j], cam);
			//console.log(screenPoint);
			pixels.data[4 * (screenPoint.x + screenPoint.y * width) + 0] = 255;
			pixels.data[4 * (screenPoint.x + screenPoint.y * width) + 1] = 0;
			pixels.data[4 * (screenPoint.x + screenPoint.y * width) + 2] = 0;
			pixels.data[4 * (screenPoint.x + screenPoint.y * width) + 3] = 255;
		}
	}
	ctx.putImageData(pixels, 0, 0);
	
	//moving camera
	var dir = new vector([0, 0, 0]);
	if (keys[87]) {
		dir.y += 1;
	}
	if (keys[83]) {
		dir.y -= 1;
	}
	if (keys[65]) {
		dir.x += 1;
	}
	if (keys[68]) {
		dir.x -= 1;
	}
	dir = dir.rotate(cam.rotation.z, 2);
	if (keys[81]) {
		dir.z -= 1;
	}
	if (keys[69]) {
		dir.z += 1;
	}
	cam.move(dir);
	
	requestAnimationFrame(render);
}

function rotateCam(e) {
	var x = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
	var y = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
	cam.rotate([(y/4.0) * -1, 0, (x/4.0)]);
	
}
function init() {
	//create a cube
	var verts = [];
	verts.push(new vector([-5, -5, 0]));
	verts.push(new vector([+5, -5, 0]));
	verts.push(new vector([+5, +5, 0]));
	verts.push(new vector([-5, +5, 0]));
	verts.push(new vector([-5, -5, 10]));
	verts.push(new vector([+5, -5, 10]));
	verts.push(new vector([+5, +5, 10]));
	verts.push(new vector([-5, +5, 10]));
	var cube = new object(verts);
	cube.polygons.push([0, 1, 2, 3]);
	cube.polygons.push([0, 1, 5, 4]);
	cube.polygons.push([3, 0, 4, 7]);
	cube.polygons.push([2, 3, 7, 6]);
	cube.polygons.push([2, 1, 5, 6]);
	cube.polygons.push([4, 5, 6, 7]);
	objects.push(cube);
	
	requestAnimationFrame(render);
}
init();

document.body.addEventListener("keydown", function(e) {
	keys[e.keyCode] = true;
	if (e.keyCode == 90) {
		cam.position.x = 50;
		cam.position.y = 50;
		cam.position.z = 50;
		cam.rotation.x = 54;
		cam.rotation.y = 0;
		cam.rotation.z = 135;
	}
});
document.body.addEventListener("keyup", function(e) {
	keys[e.keyCode] = false;
});