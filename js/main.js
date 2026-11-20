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
    var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
    var imageUniformLocation = gl.getUniformLocation(program, "u_image");

    // Create a buffer and put three 2d clip space points in it
    var positionBuffer = gl.createBuffer();

    // check if mouse is dragging
    var isDragging = false;

    // fixed-size pixel array test
    var artWidth = 512;
    var artHeight = 512;
    var pixels = new Uint8Array(artWidth * artHeight * 4);
    pixels.fill(255);

    for (var y = 30; y < 50; y++) {
        for (var x = 20; x < 40; x++) {
            setPixels(x, y);
        }
    }

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    var positions = [
        0, 0,
        artWidth, 0,
        0, artHeight,
        0, artHeight,
        artWidth, 0,
        artWidth, artHeight,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // -- functions --

    function setPixels (x, y){
        // check if oob of current fixed drawing space size
        if (x < 0 || x >= artWidth  || y < 0 || y >= artHeight) return;

        var index = (y * artWidth + x) * 4;
        pixels[index] = 255;
        pixels[index+1] = 0;
        pixels[index+2] = 255;
        pixels[index+3] = 255;
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
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);
    }

    function updateRectangle(event){
        var rectangle = canvas.getBoundingClientRect();
        var xDisplace = event.clientX - rectangle.left; // need to adjust for viewport vs. pointer position here
        var yDisplace = event.clientY - rectangle.top;
        var x = (canvas.width / rectangle.width) * xDisplace // need to also account for different scale
        var y = (canvas.height / rectangle.height) * yDisplace

        //rectangle's dimensions, to be changed later (make it adjustable with slider?)
        var recWidth = 80;
        var recHeight = 20;

        var recPositions = [
            //top left triangle
            x, y,
            x + recWidth, y,
            x, y + recHeight,
            //bottom right triangle
            x + recWidth, y,
            x + recWidth, y + recHeight,
            x, y + recHeight,
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(
             gl.ARRAY_BUFFER,
            new Float32Array(recPositions),
            gl.DYNAMIC_DRAW
        );

        draw();
    }

    function pointerDownEvent(event){
        isDragging = true;
        canvas.setPointerCapture(event.pointerId);
        updateRectangle(event);
    }

    function pointerMoveEvent(event){
        if (isDragging) updateRectangle(event);
    }

    function pointerUpEvent(event){
        isDragging = false;
    }

    // -- events --

    /*
    canvas.addEventListener("pointerdown", pointerDownEvent);
    canvas.addEventListener("pointermove", pointerMoveEvent);
    canvas.addEventListener("pointerup", pointerUpEvent);
    canvas.addEventListener("pointercancel", pointerUpEvent);
    */

    draw();
}

main();