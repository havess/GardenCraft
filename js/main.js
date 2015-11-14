<<<<<<< HEAD
var container, scene, camera, camControls, renderer, controls;
var clock
=======
var getBlockString = function(x, y, z){
	if (y==='undefined'){
		return [x,y,z].join("|");
	}
	else{
		return [v.x,v.y,v.z].join("|");		
	}
}

var createGrid3 = function(x, y, z, defaultvalue){
	//creates a 3d grid and stuff. initializes everything to null by default
	defaultvalue = (defaultvalue==='undefined' ? null : defaultvalue);
	ret=[];
	for (i=0; i<this._x; i++){
		ret.push([]);
		for (j=0; j<this._y; j++){
			ret[i].push([defaultvalue]*this._z);
		}
	}
	return ret;
}

var Grid = function(bottom, x, y, z){
	this._x=x;
	this._y=y;
	this._z=z;
	this.g=createGrid3(x, y, z, null);
}

Grid.prototype.constructor = Grid;

Grid.prototype.get = function(x, y, z){
	//callable as get(x,y,z) or get(vector)
	if(y!=='undefined'){ //first case
		return this.g[x][y][z];
	}
	else{ //vector case is assumed if only one argument is passed
		return this.g[x.x][x.y][x.z];
	}
}

Grid.prototype.diff = function(grid2){
	if ((this._x!=grid2._x)||(this._y!=grid2._y)||(this._x!=grid2._z)){
		console.log("GridDelta called with grids that are not the same size.");
	}
	// Returns a list of (x,y,z) triplets where this and grid2 differ
	ret=[];
	for (i=0; i<this._x; i++){
		for (j=0; j<this._y; j++){
			for (k=0; k<this._z; k++){
				if ((this.get(i,j,k))!=(grid2.get(i,j,k))){
					ret.push((i,j,k));
				}
			}
		}
	}
	return ret;
}

Grid.prototype.apply = function(scene){
	//
	var diff;
	var oldColor;
	var newColor;
	if (scene.oldGrid==='undefined'){
		scene.oldGrid=createGrid3(this.x, this.y, this.z);
	}
	diff = this.diff(scene.oldGrid);
	for (i=0; i<diff.length; i++){
		oldColor = apply(scene.oldGrid.get, diff[i]);
		newColor = apply(this.get, diff[i]);
		//three cases
		if (oldColor==newColor){ //do nothing
			pass;
		}
		else if (oldColor==='null'){
			var cube = new THREE.Mesh( new THREE.CubeGeometry( 1, 1, 1 ), new THREE.MeshNormalMaterial() );
			apply(cube.position.set, diff[i]);
			cube.name=getBlockString(diff[i]);
			scene.addObject(cube);
		}
		else if (newColor==='null'){
			scene.removeObject(getBlockString(diff[i]));
		}
	}
}

var container, scene, camera, renderer;
>>>>>>> 6d5b79b79cd32c70f012564448411bb5d2230188
var planeGeo, cubeGeo;
var plane, cube;
var ray_caster, mouse;

var objects = [];

function init(){
	container = document.createElement('div');
	document.body.appendChild(container);

	//SCENE
	scene = new THREE.Scene();

	clock = new THREE.Clock();

	//MOUSE
	mouse = new THREE.Vector2();

	//RAYCASTER
	ray_caster = new THREE.Raycaster();

	//CAMERA
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set(100,100,100);

	camControls = new THREE.FirstPersonControls(camera);
    camControls.lookSpeed = 0.4;
    camControls.movementSpeed = 20;
    camControls.noFly = true;
    camControls.lookVertical = true;
    camControls.constrainVertical = true;
    camControls.verticalMin = 1.0;
    camControls.verticalMax = 2.0;
    camControls.lon = -150;
    camControls.lat = 120;


	//RENDERER
	renderer = new THREE.WebGLRenderer({antialias : true});
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	//GEOMETRY
	planeGeo = new THREE.PlaneBufferGeometry(1000,1000);
	planeGeo.rotateX( - Math.PI / 2 );

	cubeGeo = new THREE.BoxGeometry(100,100,100);

	//MESHES
	plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({visible: false}));
	scene.add(plane);

	var size = 500, step = 50;

	var geometry = new THREE.Geometry();

	for ( var i = - size; i <= size; i += step ) {

		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );

		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );

	}

	var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );

	var line = new THREE.LineSegments( geometry, material );
	scene.add( line );


	//OBJECTS
	objects.push(plane);

	//LIGHTS
	var ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );

	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );
	

	//MATERIALS
	material = new THREE.MeshBasicMaterial( { color: 0x00ff00 });

	/*document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );*/

	window.addEventListener( 'resize', onWindowResize, false );

}

function onDocumentKeyUp(event){

}

function onDocumentKeyDown(event){
	//event.preventDefault();


}

function onDocumentMouseDown(event){

}

function onDocumentMouseMove(event){
	mouse.x = event.clientX;
	mouse.y = event.clientY;
}

function onWindowResize(event){

}


function render() {
	var delta = clock.getDelta();
	camControls.update(delta);
	renderer.clear();
	requestAnimationFrame(render);
	renderer.render(scene, camera);
};



init();
render();