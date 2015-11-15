'use strict'


var container, scene, camera, camControls, renderer, controls;
var clock;
var planeGeo, cubeGeo, sphereGeo;
var plane, cube, sphere;
var worlds = [];
var raycaster, mouse;

var objects = [];
var grids = [];

var deepcopyArray = function(array){
	return $.extend(true, [], array);
}

var getBlockString = function(x, y, z){
	if (y === undefined){
		return [x,y,z].join("|");
	}
	else{
		return [x.x, x.y, x.z].join("|");		
	}
}

var getBlockName = function(id, x, y, z){
	return id+'|'+getBlockString(x, y, z);
}

var createGrid3 = function(x, y, z, defaultvalue){
	//creates a 3d grid and stuff. initializes everything to null by default


	defaultvalue = (defaultvalue===undefined ? null : defaultvalue);
	var ret = new Array();
	for (var i=0; i<x; i++){
		ret.push([]);
		for (var j=0; j<y; j++){
			ret[i].push([]);
			for (var k=0; k<z; k++){
				ret[i][j][k] = defaultvalue;
			}
		}
	}
	return ret;
}

var Grid = function(position, x, y, z){
	this.id = Math.random();
	this.x = x;
	this.y = y;
	this.z = z;
	
	this.g = createGrid3(x, y, z, null);
	this.group = new THREE.Object3D();
	this.group.position.set(position.clone());
	this.group.name=this.id;
}

Grid.prototype.constructor = Grid;

Grid.prototype.clone = function(){
	var tmp = new Grid(this.group.position.clone(), this.x, this.y, this.z);
	tmp.g = $.extend(true, [], this.g);
	//tmp.group.rotation.set(this.group.rotation.clone());
	return tmp;
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
	if(val!==undefined){ //first case
		this.g[x][y][z] = val;
	}
	else{ //vector case is assumed if only one argument is passed
		this.g[x.x][x.y][x.z]=val;
	}
}

Grid.prototype.fill = function(color){
	for (var i=0; i<this.x; i++){
		for (var j=0; j<this.y; j++){
			for (var k=0; k<this.z; k++){
				this.set(i, j, k, color);
			}
		}
	}
}

Grid.prototype.mapfill = function(f){
	for (var i=0; i<this.x; i++){
		for (var j=0; j<this.y; j++){
			for (var k=0; k<this.z; k++){
				this.set(i, j, k, f(i, j, k));
			}
		}
	}
}

Grid.prototype.diff = function(grid2){
	if ((this.x!=grid2.x)||(this.y!=grid2.y)||(this.z!=grid2.z)){
		console.log("GridDelta called with grids that are not the same size.");
	}
	// Returns a list of (x,y,z) triplets where this and grid2 differ
	var ret=[];
	for (var i=0; i<this.x; i++){
		for (var j=0; j<this.y; j++){
			for (var k=0; k<this.z; k++){
				if ((this.get(i,j,k))!=(grid2.get(i,j,k))){
					ret.push([i,j,k]);
				}
			}
		}
	}
	return ret;
}

Grid.prototype.applyToScene = function(scene){
	var diff;
	var oldColor;
	var newColor;

	if (!scene.oldGrids[this.id]){
		scene.oldGrids[this.id] = new Grid(this.group.position, this.x, this.y, this.z);
	}

	diff = this.diff(scene.oldGrids[this.id]);
	//console.log("oldgrid", scene.oldGrid);
	//console.log("grid", this);
	//console.log("diff:", diff);
	for (var i=0; i<diff.length; i++){
		oldColor = Grid.prototype.get.apply(scene.oldGrids[this.id], diff[i]);
		newColor = Grid.prototype.get.apply(this, diff[i]);
		//four cases - do nothing, create new cube, delete cube, change color of cube
		if (oldColor==newColor){ //don't need to do anything, but this should never trigger
			console.log("Grid.diff is broken");
		}

		else if (oldColor===null){
			var x = diff[i][0]; //readability
			var y = diff[i][1];
			var z = diff[i][2];
			var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
			cube.position.set((this.x/2)-x-0.5, (this.y/2)-y-0.5, (this.z/2)-z-0.5);
			cube.material.color.setHex(this.get(x, y, z));
			cube.name = getBlockName(this.id, diff[i]);
			this.group.add(cube);
		}

		else if (newColor===null){
			scene.removeObject(getBlockName(this.id, diff[i]));
		}

		else{
			cube = scene.getObjectByName( getBlockName(this.id, diff[i]) );
			cube.material.color.setHex(this.get(diff[i][0], diff[i][1], diff[i][2]));
		}
	}

	scene.oldGrids[this.id] = this.clone()
}

var attachFlowerPot = function(grid){
	//does exactly what the name says
	for (var i=-1; i<grid.x+1; i++) {
		for (var k=-1; k<grid.z+1; k++) {
			var j = grid.y;
			var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
			cube.material.color.setHex(0x996633);
			cube.position.set((grid.x/2)-i-0.5, (grid.y/2)-j-0.5, (grid.z/2)-k-0.5);
			cube.name = getBlockName(grid.id, i, j, k);
			grid.group.add(cube);
			if (i==-1 || i==grid.x || k==-1 || k==grid.z){
				var j = grid.y-1;
				var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
				cube.material.color.setHex(0x996633);
				cube.position.set((grid.x/2)-i-0.5, (grid.y/2)-j-0.5, (grid.z/2)-k-0.5);
				cube.name = getBlockName(grid.id, i, j, k);
				grid.group.add(cube);
			}
		}
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
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set(10,0,10);

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

	cubeGeo = new THREE.BoxGeometry(1,1,1);

	var geometry  = new THREE.SphereGeometry(90, 32, 32);
	
	//var material  = new THREE.MeshNormalMaterial(); //rainbow mode
	var material  = new THREE.MeshBasicMaterial({color: 0x000000});

	material.side  = THREE.BackSide;
	var mesh  = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	//MESHES
	plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({visible: false}));
	scene.add(plane);

	var size = 20, step = 1;

	var geometry = new THREE.Geometry();

	for ( var i = - size; i <= size; i += step ) {

		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );

		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );

	}

	var material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, transparent: true } );

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
	scene.oldGrids={};

	//MATERIALS
	material = new THREE.MeshLambertMaterial( { color: 0x00ff00 });


	document.addEventListener( 'keydown', onKeyDown, false );
	window.addEventListener( 'resize', onWindowResize, false );


	/*var grid = new Grid(new THREE.Vector3(0,0,0), 2, 2, 2);
	for (var i=0; i<2; i++){
		for (var j=0; j<2; j++){
			grid.set(i, j, 0, 0xff3333);
			grid.set(i, j, 1, 0x3366ff);
		}
	}

	grids.push(grid);
	grids.push(grid.clone());
	grids.push(grid.clone());
	grids[0].group.position.set(1, 1, 1)
	grids[1].group.position.set(3, 3, 3);
	grids[2].group.position.set(3, 1, 1);
	
	scene.add(grids[0].group);
	scene.add(grids[1].group);
	scene.add(grids[2].group);*/

}

function generateWorld(){
	var grid = new Grid(new THREE.Vector3(0,0,0), 10, 10, 10);

	grid.mapfill( function(i, j, k){
		if ((Math.random())<0.1){
			return 0x33cc33;
		}
		return null;
	} );

	grid.group.position.set(0, 0, 0);
	attachFlowerPot(grid);
	grids.push(grid);
	updateWorldPos();
	scene.add(grid.group);

}

function updateWorldPos(){
	var distFromO = 10*(grids.length-1)/2; 
	var axis = new THREE.Vector3(0,1,0); //z axis
	var posVector = new THREE.Vector3(distFromO,7,0);
	var angle = (2*Math.PI)/grids.length;
	for(var i = 0; i < grids.length; i++){
		grids[i].group.position.set(posVector.x,posVector.y,posVector.z);
		posVector.applyAxisAngle(axis, angle);
	}
}

function reset(){
	camera.position.set(2,2,2);
}

function onKeyDown(event){
	event.preventDefault();
	switch(event.keyCode){
		case 32:
			console.log("space bar pressed");
			reset();
			break;
		case 78:
			console.log("new world created");
			generateWorld();
			break;
	}
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
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
	for (var i=0; i<grids.length; i++){
		grids[i].applyToScene(scene);
		//grids[i].group.rotation.y+=0.01;
	}

	var delta = clock.getDelta();
	for(var i = 0; i < worlds.length; i++){
		worlds[i].rotation.y += 0.05;
		worlds[i].position.set(posVector.x, posVector.y + 0.1, posVector.z);
		console.log("updating position" + worlds.length);
		posVector.applyAxisAngle(axis, angle);
	}
	camControls.update();
	renderer.clear();
	requestAnimationFrame(render);
	renderer.render(scene, camera);
};



init();
render();