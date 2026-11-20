// vertex shader
var vertexShaderSource = `
  attribute vec4 a_position;
  attribute vec2 a_texcord;
  uniform vec2 u_resolution;
  varying vec2 v_texcord;

  void main() {
     // convert the position from pixels to 0.0 to 1.0
     vec2 zeroToOne = a_position.xy / u_resolution;

     // convert from 0->1 to 0->2
     vec2 zeroToTwo = zeroToOne * 2.0;

     // convert from 0->2 to -1->+1 (clipspace)
     vec2 clipSpace = zeroToTwo - 1.0;

     gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
     
     // need to pass along text coordinates to frag
     v_texcord = a_texcord;
  }
`;

// fragment shader
var fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texcord;

  void main() {
    gl_FragColor = texture2D(u_image, v_texcord);
  }
`;