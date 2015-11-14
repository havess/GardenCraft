var container, scene, camera, camControls, renderer, controls;
var clock;
var planeGeo, cubeGeo;
var plane, cube;
var raycaster, mouse;

var objects = [];

var deepcopyArray = function(array){
	return $.extend(true, [], array);
}

var getBlockString = function(x, y, z){
	if (y===undefined){
		return [x,y,z].join("|");
	}
	else{
		return [v.x,v.y,v.z].join("|");		
	}
}

var getBlockName = function(id, x, y, z){
	return id+'|'+getBlockString(x, y, z);
}

var createGrid3 = function(x, y, z, defaultvalue){
	//creates a 3d grid and stuff. initializes everything to null by default
	defaultvalue = (defaultvalue===undefined ? null : defaultvalue);
	ret = new Array();
	for (i=0; i<x; i++){
		ret.push([]);
		for (j=0; j<y; j++){
			ret[i].push([]);
			for (k=0; k<z; k++){
				ret[i][j][k] = defaultvalue;
			}
		}
	}
	return ret;
}

var Grid = function(position, x, y, z){
	this.position = position;
	this.id = Math.random();
	this.x = x;
	this.y = y;
	this.z = z;
	this.g = createGrid3(x, y, z, null);
}

Grid.prototype.constructor = Grid;

Grid.prototype.copy = function(){
	//returns new Grid instance with a deep copy of all variables  
	return $.extend(true, {}, this);
}

Grid.prototype.get = function(x, y, z){
	//callable as get(x,y,z) or get(vector)
	if(y!=undefined){ //first case
		return this.g[x][y][z];
	}
	else{ //vector case is assumed if only one argument is passed
		console.log("this.g is",this.g);
		console.log("x is",x);
		console.log();
		return this.g[x.x][x.y][x.z];
	}
}

Grid.prototype.set = function(x, y, z, val){
	//callable as set(x,y,z,val) or set(vector, val)
	if(val!=undefined){ //first case
		this.g[x][y][z] = val;
	}
	else{ //vector case is assumed if only one argument is passed
		this.g[x.x][x.y][x.z]=val;
	}
}
Grid.prototype.diff = function(grid2){
	if ((this.x!=grid2.x)||(this.y!=grid2.y)||(this.z!=grid2.z)){
		console.log("GridDelta called with grids that are not the same size.");
	}
	// Returns a list of (x,y,z) triplets where this and grid2 differ
	ret=[];
	for (i=0; i<this.x; i++){
		for (j=0; j<this.y; j++){
			for (k=0; k<this.z; k++){
				if ((this.get(i,j,k))!=(grid2.get(i,j,k))){
					ret.push([i,j,k]);
				}
			}
		}
	}
	return ret;
}

Grid.prototype.applyToScene = function(scene){
	//
	var diff;
	var oldColor;
	var newColor;

	if (!scene.oldGrid){
		scene.oldGrid = new Grid(this.position, this.x, this.y, this.z);
	}

	diff = this.diff(scene.oldGrid);
	console.log("oldgrid", scene.oldGrid);
	console.log("grid", this);
	console.log("diff:", diff);
	for (i=0; i<diff.length; i++){
		oldColor = Grid.prototype.get.apply(scene.oldGrid, diff[i]);
		newColor = Grid.prototype.get.apply(this, diff[i]);
		//four cases - do nothing, create new cube, delete cube, change color of cube
		if (oldColor==newColor){ //don't need to do anything, but this should never trigger
			console.log("Grid.diff is broken")
		} 

		else if (oldColor===null){
			var cube = new THREE.Mesh( cubeGeo, new THREE.MeshBasicMaterial() );
			cube.position.set(diff[i][0], diff[i][1], diff[i][2]);
			cube.position.add(this.position);
			cube.material.color.setHex(this.get(diff[i][0], diff[i][1], diff[i][2]));
			cube.name=getBlockName(this.id, diff[i]);
			scene.add(cube);
		}

		else if (newColor===null){
			scene.removeObject(getBlockName(this.id, diff[i]));
		}

		else{
			cube = scene.getObjectByName( getBlockName(this.id, diff[i]) );
			cube.material.color.setHex(this.get(diff[i][0], diff[i][1], diff[i][2]));
		}
	}

	scene.oldGrid = this.copy()
}

var grid = new Grid(new THREE.Vector3(0,0,0), 2, 2, 2);
for (i=0; i<2; i++){
	for (j=0; j<2; j++){
		grid.set(i, j, 0, 0xff3333);
		grid.set(i, j, 1, 0x3366ff);
	}
}


function init(){
	container = document.createElement('div');
	document.body.appendChild(container);

	//SCENE
	scene = new THREE.Scene();

	clock = new THREE.Clock();

	//MOUSE
	mouse = new THREE.Vector2();

	//RAYCASTER
	raycaster = new THREE.Raycaster();

	//CAMERA
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set(2,2,2);

	camControls = new THREE.TrackballControls( camera );
	camControls.rotateSpeed = 10.0;
	camControls.zoomSpeed = 1.2;
	camControls.panSpeed = 0.8;
	camControls.noZoom = false;
	camControls.noPan = false;
	camControls.staticMoving = true;
	camControls.dynamicDampingFactor = 0.3;

	/*camControls = new THREE.FirstPersonControls(camera);
    camControls.lookSpeed = 0.4;
    camControls.movementSpeed = 20;
    camControls.noFly = true;
    camControls.lookVertical = true;
    camControls.constrainVertical = true;
    camControls.verticalMin = 1.0;
    camControls.verticalMax = 2.0;
    camControls.lon = -150;
    camControls.lat = 120;*/


	//RENDERER
	renderer = new THREE.WebGLRenderer({antialias : true});
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	//GEOMETRY
	planeGeo = new THREE.PlaneBufferGeometry(1000,1000);
	planeGeo.rotateX( - Math.PI / 2 );

	//
	cubeGeo = new THREE.BoxGeometry(1,1,1);

	//MESHES
	plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({visible: false}));
	scene.add(plane);

	var size = 20, step = 1;

	var geometry = new THREE.Geometry();

	for ( var i = - size; i <= size; i += step ) {

		geometry.vertices.push( new THREE.Vector3( - size+0.5, -0.5, i+0.5 ) );
		geometry.vertices.push( new THREE.Vector3(   size+0.5, -0.5, i+0.5 ) );

		geometry.vertices.push( new THREE.Vector3( i+0.5, -0.5, - size+0.5 ) );
		geometry.vertices.push( new THREE.Vector3( i+0.5, -0.5,   size+0.5 ) );

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

	//window.addEventListener( 'resize', onWindowResize, false );

	grid.applyToScene(scene);
}

function onDocumentKeyUp(event){

}

function onDocumentKeyDown(event){
	//event.preventDefault();


}

function onDocumentMouseDown(event){
	//window.addEventListener( 'resize', onWindowResize, false );
}


function render() {
	grid.applyToScene(scene);

	var delta = clock.getDelta();
	camControls.update();
	renderer.clear();
	requestAnimationFrame(render);
	renderer.render(scene, camera);
};



init();
render();