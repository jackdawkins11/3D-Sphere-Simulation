
function calcDist(x, y, z){
  var ret = Math.sqrt( x * x + y * y + z * z );
  if( ret == 0 ){
    return 0.0000000001;
  }else{
    return ret;
  }
}

function calcDist2(x, y, z){
  var ret = Math.sqrt( x * x + y * y + z * z );
  return ret;
}

class Camera{
  constructor(x, y, z, screenX, screenY, screenZ ){
    this.x = x;
    this.y = y;
    this.z = z;
    this.screenX = screenX;
    this.screenY = screenY;
    this.screenZ = screenZ;
    this.angleX = 0;
    this.angleY = 0;
    this.angleZ = 0;
  }
  project( x, y, z ){
    x -= this.x;
    y -= this.y;
    z -= this.z;
    var cX = Math.cos( this.angleX );
    var cY = Math.cos( this.angleY );
    var cZ = Math.cos( this.angleZ );
    var sX = Math.sin( this.angleX );
    var sY = Math.sin( this.angleY );
    var sZ = Math.sin( this.angleZ );
    var x1 = x,
      y1 = y * cX + z * sX,
      z1 = y * -sX + z * cX;
    var x2 = x1 * cZ + y1 * -sZ,
      y2 = x1 * sZ + y1 * cZ,
      z2 = z1;
    var dX = x2 * cY + z2 * -sY,
      dY = y2,
      dZ = x2 * sY + z2 * cY;
    return {
      x: this.screenY / dY * dX + this.screenX,
      y: this.screenY / dY * dZ + this.screenZ,
      valid: this.screenY < dY
    };
  }
  pointCameraAtPoint( x, y, z ){
    x -= this.x;
    y -= this.y;
    z -= this.z;
    var angle = Math.atan2( z, y );
    if( 0 <= z ){
      this.angleX = angle;
    }else{
      this.angleX = Math.PI * 2 + angle;
    }
    angle = Math.atan2( x, calcDist( 0, y, z ) );
    if( 0 <= x ){
      this.angleZ = angle;
    }else{
      this.angleZ = Math.PI * 2 + angle;
    }
    this.angleY = 0;
  }
}

var canvas, ctx, simulation;

function drawSquare( p0, p1, p2, p3, color ){
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo( p0.x, ctx.canvas.clientHeight - p0.y );
  ctx.lineTo( p1.x, ctx.canvas.clientHeight - p1.y );
  ctx.lineTo( p2.x, ctx.canvas.clientHeight - p2.y );
  ctx.lineTo( p3.x, ctx.canvas.clientHeight - p3.y );
  ctx.lineTo( p0.x, ctx.canvas.clientHeight - p0.y );
  ctx.closePath();
  ctx.stroke();
}

class Sphere{
  constructor( position, velocity, mass, radius, color ){
    this.position = position;
    this.velocity = velocity;
    this.mass = mass;
    this.radius = radius;
    this.color = color;
    this.squares = [];
    var sqPerCircle = 4;
    for( var i = 0; i < sqPerCircle; i++ ){
      var theta1 = Math.PI * i / sqPerCircle;
      var theta2 = Math.PI * ( i + 1 ) / sqPerCircle;
      var x1 = Math.cos( theta1 ) * this.radius;
      var x2 = Math.cos( theta2 ) * this.radius;
      var y1 = Math.sin( theta1 ) * this.radius;
      var y2 = Math.sin( theta2 ) * this.radius;
      for( var r = 0; r < sqPerCircle; r++ ){
        var phi1 = 2 * Math.PI * r / sqPerCircle;
        var phi2 = 2 * Math.PI * ( r + 1 ) / sqPerCircle;
        this.squares.push( [ { x: x1, y: Math.cos( phi1 ) * y1, z: Math.sin( phi1 ) * y1 },
          { x: x1, y: Math.cos( phi2 ) * y1, z: Math.sin( phi2 ) * y1 },
          { x: x2, y: Math.cos( phi1 ) * y2, z: Math.sin( phi1 ) * y2 },
          { x: x2, y: Math.cos( phi2 ) * y2, z: Math.sin( phi2 ) * y2 } ] );
      }
    }
  }
  draw( camera ){
    for( var i = 0; i < this.squares.length; i++ ){
      var square = [];
      for( var r = 0; r < 4; r++ ){
        square.push( camera.project( this.squares[ i ][ r ].x + this.position.x,
          this.squares[ i ][ r ].y + this.position.y,
          this.squares[ i ][ r ].z + this.position.z ) );
        if( !square[ r ].valid ){
          return;
        }
      }
      drawSquare( square[ 0 ], square[ 1 ],
        square[ 3 ], square[ 2 ], this.color );
    }
  }
  step( speed ){
    this.position.x += this.velocity.x * speed;
    this.position.y += this.velocity.y * speed;
    this.position.z += this.velocity.z * speed;
  }
}

class Simulation {
  constructor( ctx ){
    this.camera = new Camera( 0, -80000, 0,
      ctx.canvas.width / 2, ctx.canvas.width / 2, ctx.canvas.height / 2 );
    //this.camera.pointCameraAtPoint(0, 0, 0);
    this.boxSize = 50000;
    this.shouldDrawCoordinateSystem = true;
    this.precision = 2;
    this.speed = 100;
    this.spheres = [];
    for( var i = 0; i < 100; i++ ){
      this.spheres.push( new Sphere(
        { x: Math.random() * 2 * this.boxSize - this.boxSize,
          y: Math.random() * 2 * this.boxSize - this.boxSize,
          z: Math.random() * 2 * this.boxSize - this.boxSize },
        { x: Math.random() - 0.5,
          y: Math.random() - 0.5,
          z: Math.random() - 0.5 },
        1,
        this.boxSize / 20,
        "#"+((1<<24)*Math.random()|0).toString(16) ));
      if( !this.noCollisions() ){
        this.spheres.pop();
        i--;
      }
    }
  }
  
  noCollisions(){
    for( var i = 0; i < this.spheres.length; i++ ){
      if( this.preciseOutOfBounds( this.spheres[ i ] ) ){
        return false;
      }
      for( var r = 0; r < this.spheres.length; r++ ){
        if( r == i ){
          continue;
        }
        if( this.preciseContains( this.spheres[ i ], this.spheres[ r ] ) ){
          return false;
        }
      }
    }
    return true;
  }
  
  noCollisionsUnprecise(){
    for( var i = 0; i < this.spheres.length; i++ ){
      if( this.unpreciseOutOfBounds( this.spheres[ i ] ) ){
        console.log( "OUTOFBOUNDS" );
        console.log( this.spheres[ i ] );
        return false;
      }
      for( var r = 0; r < this.spheres.length; r++ ){
        if( r == i ){
          continue;
        }
        if( this.unpreciseContains( this.spheres[ i ], this.spheres[ r ] ) ){
          console.log( "CONTAINS" );
          console.log( this.spheres[ i ] );
          console.log( this.spheres[ r ] );
          return false;
        }
      }
    }
    return true;
  }
  
  preciseOutOfBounds( sphere ){
    return this.boxSize <= sphere.position.x + sphere.radius
      || this.boxSize <= sphere.position.y + sphere.radius
      || this.boxSize <= sphere.position.z + sphere.radius
      || sphere.position.x - sphere.radius < -this.boxSize
      || sphere.position.y - sphere.radius < -this.boxSize
      || sphere.position.z - sphere.radius < -this.boxSize;
  }

  unpreciseOutOfBounds( sphere ){
    return this.boxSize + this.precision <= sphere.position.x + sphere.radius
      || this.boxSize + this.precision <= sphere.position.y + sphere.radius
      || this.boxSize + this.precision <= sphere.position.z + sphere.radius
      || sphere.position.x - sphere.radius < -this.boxSize - this.precision
      || sphere.position.y - sphere.radius < -this.boxSize - this.precision
      || sphere.position.z - sphere.radius < -this.boxSize - this.precision;
  }
  
  preciseContains( a, b ){
    var x = a.position.x - b.position.x,
      y = a.position.y - b.position.y,
      z = a.position.z - b.position.z;
    return calcDist2( x, y, z ) < a.radius + b.radius;
  }
  
  unpreciseContains( a, b ){
    var x = a.position.x - b.position.x,
      y = a.position.y - b.position.y,
      z = a.position.z - b.position.z;
    return calcDist2( x, y, z ) + this.precision < a.radius + b.radius;
  }
  
  calculateCrash( a, b ){
    var x1 = a.position.x,
      y1 = a.position.y,
      z1 = a.position.z,
      vX1 = a.velocity.x,
      vY1 = a.velocity.y,
      vZ1 = a.velocity.z,
      x2 = b.position.x,
      y2 = b.position.y,
      z2 = b.position.z,
      vX2 = b.velocity.x,
      vY2 = b.velocity.y,
      vZ2 = b.velocity.z,
      m1 = a.mass,
      m2 = b.mass;
    var dot1 = ( vX1 - vX2 ) * ( x1 - x2 )
      + ( vY1 - vY2 ) * ( y1 - y2 )
      + ( vZ1 - vZ2 ) * ( z1 - z2 );
    var dot2 = ( vX2 - vX1 ) * ( x2 - x1 )
      + ( vY2 - vY1 ) * ( y2 - y1 )
      + ( vZ2 - vZ1 ) * ( z2 - z1 );
    var length1Squared = Math.pow( x1 - x2, 2 )
      + Math.pow( y1 - y2, 2 )
      + Math.pow( z1 - z2, 2 );
    var length2Squared = Math.pow( x2 - x1, 2 )
      + Math.pow( y2 - y1, 2 )
      + Math.pow( z2 - z1, 2 );
    var multiple1 = ( dot1 / length1Squared ) * 2 * m2 / ( m1 + m2 );
    var multiple2 = ( dot2 / length2Squared ) * 2 * m1 / ( m1 + m2 );
    a.velocity.x = ( vX1 - ( x1 - x2 ) * multiple1 );
    a.velocity.y = ( vY1 - ( y1 - y2 ) * multiple1 );
    a.velocity.z = ( vZ1 - ( z1 - z2 ) * multiple1 );
    b.velocity.x = ( vX2 - ( x2 - x1 ) * multiple2 );
    b.velocity.y = ( vY2 - ( y2 - y1 ) * multiple2 );
    b.velocity.z = ( vZ2 - ( z2 - z1 ) * multiple2 );
  }

  step( sphere ){
    if( !this.noCollisionsUnprecise() ){
      console.log( "ERROR" );
    }
    var x = sphere.position.x;
    var y = sphere.position.y;
    var z = sphere.position.z;
    var vx = sphere.velocity.x;
    var vy = sphere.velocity.y;
    var vz = sphere.velocity.z;
    if( vx == 0 && vy == 0 && vz == 0 ){
      return;
    }
    const NOCRASH = 0;
    const XWALL = 1;
    const YWALL = 2;
    const ZWALL = 3;
    const OTHERSPHERE = 4;
    var crashType = NOCRASH;
    var crashSphere = null;
    var crashC = 0;
    var dv = calcDist2( vx, vy, vz );
    var nvx = vx / dv;
    var nvy = vy / dv;
    var nvz = vz / dv;
    for( var i = 0; i < this.spheres.length; i++ ){
      var other = this.spheres[ i ];
      if( other == sphere ){
        continue;
      }
      var bx = other.position.x - x;
      var by = other.position.y - y;
      var bz = other.position.z - z;
      var c1 = ( bx * vx + by * vy + bz * vz ) / dv;
      if( c1 < 0 ){
        continue;
      }
      var pvx = c1 * nvx;
      var pvy = c1 * nvy;
      var pvz = c1 * nvz;
      var d1 = calcDist2( pvx - bx, pvy - by, pvz - bz );
      var R = sphere.radius + other.radius;
      if( R < d1 ){
        continue;
      }
      var d2 = Math.sqrt( R * R - d1 * d1 );
      var c2 = c1 - d2;
      if( crashType == NOCRASH || c2 < crashC ){
        crashType = OTHERSPHERE;
        crashSphere = other;
        crashC = c2;
      }
    }
    var c = -(x+this.boxSize) / nvx;
    if( 0 < c ){
      var theta = Math.acos( calcDist( 0, nvy, nvz ) / calcDist( nvx, nvy, nvz ) );
      var d = sphere.radius / Math.sin( theta );
      c -= d;
      if( crashType == NOCRASH || c < crashC ){
        crashType = XWALL;
        crashC = c;
      }
    }
    c = -(y+this.boxSize) / nvy;
    if( 0 < c ){
      var theta = Math.acos( calcDist( nvx, 0, nvz ) / calcDist( nvx, nvy, nvz ) );
      var d = sphere.radius / Math.sin( theta );
      c -= d;
      if( crashType == NOCRASH || c < crashC ){
        crashType = YWALL;
        crashC = c;
      }
    }
    c = -(z+this.boxSize) / nvz;
    if( 0 < c ){
      var theta = Math.acos( calcDist( nvx, nvy, 0 ) / calcDist( nvx, nvy, nvz ) );
      var d = sphere.radius / Math.sin( theta );
      c -= d;
      if( crashType == NOCRASH || c < crashC ){
        crashType = ZWALL;
        crashC = c;
      }
    }
    c = (this.boxSize-x) / nvx;
    if( 0 < c ){
      var theta = Math.acos( calcDist( 0, nvy, nvz ) / calcDist( nvx, nvy, nvz ) );
      var d = sphere.radius / Math.sin( theta );
      c -= d;
      if( crashType == NOCRASH || c < crashC ){
        crashType = XWALL;
        crashC = c;
      }
    }
    c = (this.boxSize-y) / nvy;
    if( 0 < c ){
      var theta = Math.acos( calcDist( nvx, 0, nvz ) / calcDist( nvx, nvy, nvz ) );
      var d = sphere.radius / Math.sin( theta );
      c -= d;
      if( crashType == NOCRASH || c < crashC ){
        crashType = YWALL;
        crashC = c;
      }
    }
    c = (this.boxSize-z) / nvz;
    if( 0 < c ){
      var theta = Math.acos( calcDist( nvx, nvy, 0 ) / calcDist( nvx, nvy, nvz ) );
      var d = sphere.radius / Math.sin( theta );
      c -= d;
      if( crashType == NOCRASH || c < crashC ){
        crashType = ZWALL;
        crashC = c;
      }
    }
    if( crashC <= this.speed ){
      sphere.step( crashC );
      if( crashType == OTHERSPHERE ){
        this.calculateCrash( sphere, crashSphere );
      }else if( crashType == XWALL ){
        sphere.velocity.x *= -1;
      }else if( crashType == YWALL ){
        sphere.velocity.y *= -1;
      }else if( crashType == ZWALL ){
        sphere.velocity.z *= -1;
      }
    }else{
      sphere.step( this.speed );
    }
  }
  drawCoordinateSystem(){
    var numPoints = 10;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.font = '20px sans-serif';
    ctx.beginPath();
    var p0 = this.camera.project( -this.boxSize * 1.2, 0, 0 );
    ctx.fillText( "X", p0.x, ctx.canvas.clientHeight - p0.y );
    p0 = this.camera.project( -this.boxSize, 0, 0 );
    ctx.moveTo( p0.x, ctx.canvas.clientHeight - p0.y );
    for( var i = 0; i <= numPoints; i++ ){
      if( numPoints / 2 == i ) continue;
      var dist = this.boxSize * 2 * i / numPoints;
      p0 = this.camera.project( -this.boxSize + dist, 50, 50 );
      ctx.fillText( -this.boxSize + dist + "", p0.x, ctx.canvas.clientHeight - p0.y );
    }
    p0 = this.camera.project( this.boxSize, 0, 0 );
    ctx.lineTo( p0.x, ctx.canvas.clientHeight - p0.y );
    p0 = this.camera.project( 0, -this.boxSize * 1.2, 0 );
    ctx.fillText( "Y", p0.x, ctx.canvas.clientHeight - p0.y );
    p0 = this.camera.project( 0, -this.boxSize, 0 );
    ctx.moveTo( p0.x, ctx.canvas.clientHeight - p0.y );
    for( var i = 0; i <= numPoints; i++ ){
      if( numPoints / 2 == i ) continue;
      var dist = this.boxSize * 2 * i / numPoints;
      p0 = this.camera.project( 50, -this.boxSize + dist, 50 );
      ctx.fillText( -this.boxSize + dist + "", p0.x, ctx.canvas.clientHeight - p0.y );
    }
    p0 = this.camera.project( 0, this.boxSize, 0 );
    ctx.lineTo( p0.x, ctx.canvas.clientHeight - p0.y );
    p0 = this.camera.project( 0, 0, -this.boxSize * 1.2 );
    ctx.fillText( "Z", p0.x, ctx.canvas.clientHeight - p0.y );
    p0 = this.camera.project( 0, 0, -this.boxSize );
    ctx.moveTo( p0.x, ctx.canvas.clientHeight - p0.y );
    for( var i = 0; i <= numPoints; i++ ){
      if( numPoints / 2 == i ) continue;
      var dist = this.boxSize * 2 * i / numPoints;
      p0 = this.camera.project( 50, 50, -this.boxSize + dist );
      ctx.fillText( -this.boxSize + dist + "", p0.x, ctx.canvas.clientHeight - p0.y );
    }
    p0 = this.camera.project( 0, 0, this.boxSize );
    ctx.lineTo( p0.x, ctx.canvas.clientHeight - p0.y );
    ctx.closePath();
    ctx.stroke();
  }
  
  draw(){
    ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height );
    if( this.shouldDrawCoordinateSystem ){
      this.drawCoordinateSystem();
    }
    for( var i = 1; i < this.spheres.length; i++ ){
      var r = i;
      while( 0 < r && calcDist2( this.spheres[ r - 1 ].position.x - this.camera.x,
        this.spheres[ r - 1 ].position.y - this.camera.y,
        this.spheres[ r - 1 ].position.z - this.camera.z ) <
        calcDist2( this.spheres[ r ].position.x - this.camera.x,
        this.spheres[ r ].position.y - this.camera.y,
        this.spheres[ r ].position.z - this.camera.z ) ){
        var tmp = this.spheres[ r ];
        this.spheres[ r ] = this.spheres[ r - 1 ];
        this.spheres[ r - 1 ] = tmp;
        r--;
      }
    }
    for( var i = 0; i < this.spheres.length; i++ ){
      this.spheres[ i ].draw( this.camera );
    }
  }
}

var keys= {};

function initKeys(){
  document.addEventListener( 'keydown', (e) => {
    keys[ e.key ] = true;
  if( e.key == 'c' ){
    if( simulation.shouldDrawCoordinateSystem ){
      simulation.shouldDrawCoordinateSystem = false;
    }else{
      simulation.shouldDrawCoordinateSystem = true;
    }
  }
  });
  document.addEventListener( 'keyup', (e) => {
    keys[ e.key ] = false;
  });
}

function updatePos(){
  if( keys[ 'q' ] ){
    simulation.camera.z -= simulation.boxSize / 10;
    simulation.camera.pointCameraAtPoint(0, 0, 0);
  }
  if( keys[ 'e' ] ){
    simulation.camera.z += simulation.boxSize / 10;
    simulation.camera.pointCameraAtPoint(0, 0, 0);
  }
  if( keys[ 'a' ] ){
    simulation.camera.x -= simulation.boxSize / 10;
    simulation.camera.pointCameraAtPoint(0, 0, 0);
  }
  if( keys[ 'd' ] ){
    simulation.camera.x += simulation.boxSize / 10;
    simulation.camera.pointCameraAtPoint(0, 0, 0);
  }
  if( keys[ 'w' ] ){
    simulation.camera.y += simulation.boxSize / 10;
    simulation.camera.pointCameraAtPoint(0, 0, 0);
  }
  if( keys[ 's' ] ){
    simulation.camera.y -= simulation.boxSize / 10;
    simulation.camera.pointCameraAtPoint(0, 0, 0);
  }
  if( keys[ 'n' ] ){
    simulation.camera.angleY -= 0.1;
  }
  if( keys[ 'm' ] ){
    simulation.camera.angleY += 0.1;
  }
  if( keys[ 'ArrowUp' ] ){
    simulation.speed *= 2;
  }
  if( keys[ 'ArrowDown' ] ){
    simulation.speed /= 2;
  }
  for( var i = 0; i < simulation.spheres.length; i++ ){
    simulation.step( simulation.spheres[ i ] );
  }
};

function animate(){
  updatePos();
  simulation.draw();
  window.requestAnimationFrame( animate );
}

window.onload = function(){
  canvas = document.getElementById( "screen" );
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
  ctx = canvas.getContext( '2d' );
  simulation = new Simulation( ctx );
  window.addEventListener( 'resize', function(){
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    simulation.camera.screenX = canvas.width / 2;
    simulation.camera.screenY = canvas.width / 2;
    simulation.camera.screenZ = canvas.height / 2;
  });
  initKeys();
  window.requestAnimationFrame( animate );
};
