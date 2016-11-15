var ctx = canvas.getContext('2d');

var width = canvas.width = 1200;
var height = canvas.height = 1000;

var squares, lines, lineStarts;

var noStraight = false;


var cellSize = 100;
var halfCellSize = cellSize/2;

var colors = 4;

var sat = 80;
var light = 60;

var lineWidth = halfCellSize/4;

var shadowAlpha = 0.2;
var shadowSpread = 5;

var PI = Math.PI;

var hue = 0;

var sectionDrawQueue = [];

/*
square[x][y] = a single square
square = {
    t: true/false,
    r: true/false,
    b: true/false,
    l: true/false
}
t = top open
r = right open
b = bottom open
l = left open
*/
var countX = Math.floor((width/cellSize) + 0.9);
var countY = Math.floor((height/cellSize) + 0.9);

function resetGrid() {
    squares = [];
    lines = [];
    lineStarts = [];
    for (var x = 0; x < countX; x += 1) {
        squares.push([]);
        for (var y = 0; y < countY; y += 1) {
            squares[x].push({
                t: true,
                r: true,
                b: true,
                l: true
            });

            if (x == 0) {
                lineStarts.push({
                    x: x,
                    y: y,
                    in: "l"
                });
            } else if (x == countX - 1) {
                lineStarts.push({
                    x: x,
                    y: y,
                    in: "r"
                });
            };

            if (y == 0) {
                lineStarts.push({
                    x: x,
                    y: y,
                    in: "t"
                });
            } else if (y == countY - 1) {
                lineStarts.push({
                    x: x,
                    y: y,
                    in: "b"
                });
            };
        };
    };
};

function getOptions(x, y, entry) {
    var options = [];

    if (squares[x][y]["t"] && entry != "t" && (!noStraight || entry != "b")) {
        options.push("t");
    };
    if (squares[x][y]["r"] && entry != "r" && (!noStraight || entry != "l")) {
        options.push("r");
    };
    if (squares[x][y]["b"] && entry != "b" && (!noStraight || entry != "t")) {
        options.push("b");
    };
    if (squares[x][y]["l"] && entry != "l" && (!noStraight || entry != "r")) {
        options.push("l");
    };

    return options;
};

function getNewColor() {
    hue += (360/colors);
    return 'hsl(' + ~~hue + ',' + sat + '%,' + light + '%)';
};

function advanceLine(line, x, y, entry) {
    if (x < 0 || x >= squares.length || y < 0 || y >= squares[0].length) {
        //reached edge, stop extending
        return line;
    };

    //console.log("At", x, y, "from", entry);
    //console.log("t:", squares[x][y].t, "r:", squares[x][y].r, "b:", squares[x][y].b, "l:", squares[x][y].l);
    
    var options = getOptions(x, y, entry);

    if (options.length == 0) {
        //console.log("No options!");
        return false;
    } else {
        //console.log("Options are", options);
        squares[x][y][entry] = false;

        while (options.length > 0) {
            var choice = options[Math.floor(Math.random() * options.length)];

            options.splice(options.indexOf(choice), 1);

            squares[x][y][choice] = false;

            var newLine = line.slice(0);
            newLine.push({
                x: x,
                y: y,
                in: entry,
                out: choice,
                color: line.length > 0 ? line[0].color : getNewColor()
            });
            
            var nX = x;
            var nY = y;
            var nEntry = "";

            switch (choice) {
                case "t":
                    nY -= 1;
                    nEntry = "b";
                    break;
                case "r":
                    nX += 1;
                    nEntry = "l";
                    break;
                case "b":
                    nY += 1;
                    nEntry = "t";
                    break;
                case "l":
                    nX -= 1;
                    nEntry = "r";
                    break;
            };

            var attempt = advanceLine(newLine, nX, nY, nEntry);
            if (attempt) {
                return attempt;
            } else {
                squares[x][y][choice] = true;
            };
        };

        squares[x][y][entry] = true;

        return false;
    };
};

function checkLine(line) {
    for (var i = 0; i < line.length; i++) {
        var p = line[i];
        if (squares[p.x][p.y][p.in]) {
            console.log("Square at", p.x, p.y, p.in);
        }
        if (squares[p.x][p.y][p.out]) {
            console.log("Square at", p.x, p.y, p.out);
        }
    };
};

function attemptFill() {
    for (var i = 0; i < lineStarts.length; i++) {
        var start = lineStarts[i];
        if (squares[start.x][start.y][start.in]) {
            
            var line = advanceLine([], start.x, start.y, start.in);

            if (line) {
                lines.push(line);

                checkLine(line);
            };
        };
    };
};

function drawSection(section) {
    var points = section.in + section.out;

    ctx.beginPath();

    switch (points) {
        case "tr":
        case "rt":
            /*
            +----T----@
            |         |
            |         R
            |         |
            +---------+
            */
            ctx.arc(
                section.x * cellSize + cellSize,
                section.y * cellSize,
                halfCellSize, 
                1 * PI,
                0.5 * PI,
                true
            );
            break;
        
        case "tb":
        case "bt":
            /*
            +----T----+
            |         |
            |         |
            |         |
            +----B----+
            */
            ctx.moveTo(
                section.x * cellSize + halfCellSize,
                section.y * cellSize
            );
            ctx.lineTo(
                section.x * cellSize + halfCellSize,
                section.y * cellSize + cellSize
            );
            break;
        
        case "tl":
        case "lt":
            /*
            @----T----+
            |         |
            L         |
            |         |
            +---------+
            */
            ctx.arc(
                section.x * cellSize,
                section.y * cellSize,
                halfCellSize,
                0,
                0.5 * PI,
                false
            );
            break;
        
        case "rb":
        case "br":
            /*
            +---------+
            |         |
            |         R
            |         |
            +----B----@
            */
            ctx.arc(
                section.x * cellSize + cellSize,
                section.y * cellSize + cellSize,
                halfCellSize,
                1.5 * PI,
                1 * PI,
                true
            );
            break;
        
        case "rl":
        case "lr":
            /*
            +---------+
            |         |
            L         R
            |         |
            +---------+
            */
            ctx.moveTo(
                section.x * cellSize,
                section.y * cellSize + halfCellSize
            );
            ctx.lineTo(
                section.x * cellSize + cellSize,
                section.y * cellSize + halfCellSize
            );
            break;
        
        case "bl":
        case "lb":
            /*
            +---------+
            |         |
            L         |
            |         |
            @----B----+
            */
            ctx.arc(
                section.x * cellSize,
                section.y * cellSize + cellSize,
                halfCellSize,
                1.5 * PI,
                0,
                false
            );
            break;
    };

    for (var j = shadowSpread; j > 0; j--) {
        ctx.lineWidth = lineWidth + j;
        ctx.strokeStyle = 'rgba(0, 0, 0,' + shadowAlpha/shadowSpread + ')';
        ctx.stroke();
    };
    
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = section.color;
    ctx.stroke();
};

function drawLine(line) {
    var color = line[0].color;
    for (var i = 0; i < line.length; i++) {
        drawSection(line[i], color);
    };
};

function setDrawQueue() {
    var newLines = [].concat(lines);

    sectionDrawQueue = [];

    var i = 0;
    while (newLines.length > 0) {
        if (i >= newLines.length) {
            i = 0;
        };

        sectionDrawQueue.push(newLines[i].splice(Math.floor(Math.random() * newLines[i].length), 1)[0]);

        if (newLines[i].length == 0) {
            newLines.splice(i, 1);
        };

        i += 1;
    };
};

function draw() {
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < lines.length; i++) {
        drawLine(lines[i]);
    };
};

function drawQueue() {
    for (var i = 0; i < sectionDrawQueue.length; i++) {
        drawSection(sectionDrawQueue[i]);
    }
};


resetGrid();
attemptFill();

setDrawQueue();
drawQueue();