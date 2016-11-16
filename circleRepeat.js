var ctx = canvas.getContext('2d');

//var width = canvas.width = 3508;
//var height = canvas.height = 2480;
var width = canvas.width = window.innerWidth;
var height = canvas.height = window.innerHeight;

var radius = 140;
var inset = 26;
var maxInside = 3;

var randomness = radius * 0.12;

var colorVariation = 80;

var lineWidth = 4;

var xDist = radius * 2 * 0.9;
var yDist = radius * 1 * 0.5;

var PI = Math.PI;
var TWO_PI = Math.PI * 2;

function randomArc(x, y, rad) {
    var p1 = {
        x: x - rad + (Math.random() - 0.5) * randomness,
        y: y + (Math.random() - 0.5) * randomness
    };
    var p2 = {
        x: x + rad + (Math.random() - 0.5) * randomness,
        y: y + (Math.random() - 0.5) * randomness
    };
    var c1 = {
        x: p1.x + (Math.random() - 0.5) * randomness,
        y: p1.y - rad * 1.5 + (Math.random() - 0.5) * randomness
    };
    var c2 = {
        x: p2.x + (Math.random() - 0.5) * randomness,
        y: p2.y - rad * 1.5  + (Math.random() - 0.5) * randomness
    }
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
}

function draw() {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth;
    
    var yOffset = false;
    for (var y = 0; y < height + yDist * 1.5; y += yDist) {
        for (var x = yOffset ? 0 : xDist/2; x < width + xDist; x += xDist) {
            for (var rad = radius, i = 0; rad > 0 && i <= maxInside; i++) {
                ctx.beginPath();

                randomArc(x, y, rad);
                //ctx.arc(x, y, rad, PI, TWO_PI);

                var lightness = ~~(Math.random() * colorVariation);
                ctx.strokeStyle = 'rgb(' + lightness + ', ' + lightness + ', ' + lightness + ')';

                ctx.fill();
                ctx.stroke();

                rad -= inset;
            }
        }
        yOffset = !yOffset
    }
}

draw();