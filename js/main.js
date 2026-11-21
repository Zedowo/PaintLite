"use strict";

function main() {
    // Get A WebGL context
    var canvas = document.querySelector("#c");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    // Use our boilerplate utils to compile the shaders and link into a program
    var program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);
    // look up where the vertex data needs to go.
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    // look up uniform locations
    var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

    // look up the shader inputs
    var texcordLocation = gl.getAttribLocation(program, "a_texcord");
    var imgLocation = gl.getUniformLocation(program, "u_image");

    //-- buffers --

    // Create a pos + tex buffer
    var positionBuffer = gl.createBuffer();
    var texcordBuffer = gl.createBuffer();

    // ---

    // check if mouse is dragging
    var isDragging = false;

    var brushSize = 10;
    var slider = document.getElementById("myRange");
    var output = document.getElementById("demo");
    output.innerHTML = slider.value; // Display the default slider value
    brushSize = Number(slider.value); // parse, can return string

    slider.oninput = function() {
        output.innerHTML = this.value;
        brushSize = Number(slider.value);
    }

    var prevX = null;
    var prevY = null;

    // fixed-size pixel array test
    var artWidth = 512;
    var artHeight = 512;
    var pixels = new Uint8Array(artWidth * artHeight * 4);
    pixels.fill(255);

    var undoHistory = [];
    var redoHistory = [];
    var limit = 20;

    // ---

    var clearButton = document.getElementById("clear-canvas");
    var undoButton = document.getElementById("undo");
    var redoButton = document.getElementById("redo");

    var positions = [
        0, 0,
        artWidth, 0,
        0, artHeight,
        0, artHeight,
        artWidth, 0,
        artWidth, artHeight,
    ];

    var texcords = [
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
    ];

    // bind buffers (one after the other, so it doesn't target same buffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcords), gl.STATIC_DRAW);

    // create + select texture, put texture on unit 0
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // display colors + clamp texture cords, then upload
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, artWidth, artHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // -- functions --

    function squareBrush(x, y){
        var xCord = x - Math.floor(brushSize / 2);
        var yCord = y - Math.floor(brushSize / 2);

        for (var i = 0; i < brushSize; i++){
            for (var j = 0; j < brushSize; j++){
                setPixel(xCord + j, yCord + i);
            }
        }
    }

    function setPixel (x, y){
        // check if oob of current fixed drawing space size
        if (x < 0 || x >= artWidth  || y < 0 || y >= artHeight) return;

        var index = (y * artWidth + x) * 4;
        pixels[index] = 255;
        pixels[index+1] = 0;
        pixels[index+2] = 255;
        pixels[index+3] = 255;
    }

    function uploadPixels(){
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, artWidth, artHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }

    function paint(event){
        var rectangle = canvas.getBoundingClientRect();
        var xDisplace = event.clientX - rectangle.left;
        var yDisplace = event.clientY - rectangle.top;
        var x = Math.floor((canvas.width / rectangle.width) * xDisplace); // pointer position; floor to round to whole number
        var y = Math.floor((canvas.height / rectangle.height) * yDisplace);

        if (prevX === null || prevY === null) squareBrush(x, y); // draw if no point to connect to
        else{
            var dx = x - prevX;
            var dy = y - prevY;
            var numSteps = Math.max(Math.abs(dx), Math.abs(dy));

            if (numSteps === 0) squareBrush(x, y); // no movement
            else {
                for (var step = 1; step <= numSteps; step++) {
                    var currProgress = step / numSteps;
                    var brushX = Math.round(prevX + (dx * currProgress)); // interpolation
                    var brushY = Math.round(prevY + (dy * currProgress));

                    squareBrush(brushX, brushY);

                }
            }
        }

        prevX = x;
        prevY = y;
        uploadPixels();
        draw();
    }

    function draw(){
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            positionAttributeLocation, size, type, normalize, stride, offset);

        // set the resolution
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        // draw
        var primitiveType = gl.TRIANGLES;
        offset = 0;
        var count = 6;

        gl.enableVertexAttribArray(texcordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcordBuffer);
        gl.vertexAttribPointer(texcordLocation, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(imgLocation, 0);

        gl.drawArrays(primitiveType, offset, count);
    }

    function saveHistory(){
        undoHistory.push(pixels.slice());

        if (undoHistory.length > limit) undoHistory.shift(); // as name implies, shifts over array
        redoHistory.length = 0;
    }

    function undo(){
        if (undoHistory.length === 0) return;

        redoHistory.push(pixels.slice());
        pixels.set(undoHistory.pop()); // grab previous state

        prevX = null
        prevY = null;

        uploadPixels();
        draw();
    }

    function redo(){
        if (redoHistory.length === 0) return;

        undoHistory.push(pixels.slice());
        pixels.set(redoHistory.pop());

        prevX = null
        prevY = null;

        uploadPixels();
        draw();
    }

    function clearCanvas(){
        saveHistory();

        pixels.fill(255);

        isDragging = false;
        prevX = null
        prevY = null;

        uploadPixels();
        draw();
    }

    function pointerDownEvent(event){
        if (event.button === 2) return; // prevent right click

        saveHistory();

        isDragging = true;
        prevX = null; // reset stroke
        prevY = null;

        canvas.setPointerCapture(event.pointerId);
        paint(event);
    }

    function pointerMoveEvent(event){
        if (isDragging) paint(event);
    }

    function pointerUpEvent(event){
        isDragging = false;
        prevX = null; // reset stroke
        prevY = null;
    }

    // -- events --


    canvas.addEventListener("pointerdown", pointerDownEvent);
    canvas.addEventListener("pointermove", pointerMoveEvent);
    canvas.addEventListener("pointerup", pointerUpEvent);
    canvas.addEventListener("pointercancel", pointerUpEvent);

    clearButton.addEventListener("click", clearCanvas);
    undoButton.addEventListener("click", undo);
    redoButton.addEventListener("click", redo);

    //canvas.addEventListener("pointerdown", paint);

    draw();
}

main();