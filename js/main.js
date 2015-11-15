'use strict'


var container, scene, camera, camControls, renderer, controls;
var clock;
var planeGeo, cubeGeo, sphereGeo;
var plane, cube, sphere;
var worlds = [];
var raycaster, mouse;

var objects = [];
var pots = [];

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

var randrange = function(low, high){
	//generates an integer between low and high inclusive
	return low+Math.floor((high-low+1)*Math.random());
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
	this.group.position.set(position);
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
	if ((x<0) || (y<0) || z<0){
		return null;
	}
	if (x>=this.x || y>=this.y || z>=this.z){
		return null;
	}

	if(y!=undefined || z!=undefined){ //first case
		//console.log("x, y, z",x, y, z);
		return this.g[x][y][z];
	}
	else{ //vector case is assumed if only one argument is passed
		console.log("this.g is", this.g);
		console.log("x is", x);
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
		console.log(x);
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

Grid.prototype.insertBlock = function(x, y, z, _color){
	var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial({color: _color}) );
	cube.position.set((this.x/2)-x-0.5, (this.y/2)-y-0.5, (this.z/2)-z-0.5);
	cube.name = getBlockName(this.id, x, y, z);
	this.group.add(cube);
}

Grid.prototype.isAvailable = function(x, y, z){
	if ((x<0) || (y<0) || z<0){
		return false;
	}
	if (x>=this.x || y>=this.y || z>=this.z){
		return false;
	}
	return (this.get(x,y,z)===null);
}

Grid.prototype.diff = function(grid2){
	if ((this.x!=grid2.x)||(this.y!=grid2.y)||(this.z!=grid2.z)){
		console.log("GridDelta called with pots that are not the same size.");
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

	if (!scene.oldpots[this.id]){
		scene.oldpots[this.id] = new Grid(this.group.position, this.x, this.y, this.z);
	}

	diff = this.diff(scene.oldpots[this.id]);
	//console.log("oldgrid", scene.oldGrid);
	//console.log("grid", this);
	//console.log("diff:", diff);
	for (var i=0; i<diff.length; i++){
		oldColor = Grid.prototype.get.apply(scene.oldpots[this.id], diff[i]);
		newColor = Grid.prototype.get.apply(this, diff[i]);
		//four cases - do nothing, create new cube, delete cube, change color of cube
		if (oldColor==newColor){ //don't need to do anything, but this should never trigger
			console.log("Grid.diff is broken");
		}

		else if (oldColor===null){
			this.insertBlock(diff[i][0], diff[i][1], diff[i][2], this.get(diff[i][0], diff[i][1], diff[i][2]));
		}

		else if (newColor===null){
			scene.removeObject(getBlockName(this.id, diff[i]));
		}

		else{
			cube = scene.getObjectByName( getBlockName(this.id, diff[i]) );
			cube.material.color.setHex(this.get(diff[i][0], diff[i][1], diff[i][2]));
		}
	}

	scene.oldpots[this.id] = this.clone()
}

var FlowerPot = function(position, x, y, z){
	Grid.call(this, position, x, y, z);

	this.flora = [];

	//now attach the actual flower pot with a bunch of ugly for loops
	for (var i=-1; i<this.x+1; i++) {
		for (var k=-1; k<this.z+1; k++) {
			var j = this.y;
			var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
			cube.material.color.setHex(0x5f4020);
			cube.position.set((this.x/2)-i-0.5, (this.y/2)-j-0.5, (this.z/2)-k-0.5);
			cube.name = getBlockName(this.id, i, j, k);
			this.group.add(cube);


			if (i==-1 || i==this.x || k==-1 || k==this.z){
				var j = this.y;
				var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
				cube.material.color.setHex(0x996633);
				cube.position.set((this.x/2)-i-0.5, (this.y/2)-j-0.5, (this.z/2)-k-0.5);
				cube.name = getBlockName(this.id, i, j, k);
				this.group.add(cube);

				var j = this.y-1;
				var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
				cube.material.color.setHex(0x996633);
				cube.position.set((this.x/2)-i-0.5, (this.y/2)-j-0.5, (this.z/2)-k-0.5);
				cube.name = getBlockName(this.id, i, j, k);
				this.group.add(cube);
			}
		}
	}

	for (var i=0; i<this.x; i++) {
		for (var k=0; k<this.z; k++) {
			var j = this.y+1;
			var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
			cube.material.color.setHex(0x996633);
			cube.position.set((this.x/2)-i-0.5, (this.y/2)-j-0.5, (this.z/2)-k-0.5);
			cube.name = getBlockName(this.id, i, j, k);
			this.group.add(cube);
		}
	}

	for (var i=1; i<this.x-1; i++) {
		for (var k=1; k<this.z-1; k++) {
			var j = this.y+2;
			var cube = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial() );
			cube.material.color.setHex(0x996633);
			cube.position.set((this.x/2)-i-0.5, (this.y/2)-j-0.5, (this.z/2)-k-0.5);
			cube.name = getBlockName(this.id, i, j, k);
			this.group.add(cube);
		}
	}
}

FlowerPot.prototype = new Grid;
FlowerPot.prototype.constructor = FlowerPot;

FlowerPot.prototype.plant = function(florafunc, startpos){
	var newFlora = new Flora(this, florafunc);
	newFlora.startpos = startpos;
	newFlora.pot = this;
	newFlora.updatefunc = florafunc;
	this.flora.push(newFlora);
}

FlowerPot.prototype.update = function(dt){
	console.log("FlowerPot.update called");
	for (var i=0; i<this.flora.length; i++){
		this.flora[i].update(dt);
	}
}

var Flora = function(pot, updatefunc){
	//func should take (this, dt)
	Grid.call(this, new THREE.Vector3(2, 2, 2), pot.x, pot.y, pot.z);
	this.seed = Math.random();
	this.updatefunc = updatefunc;
}

Flora.prototype = new Grid;

Flora.prototype.constructor = Flora;

Flora.prototype.clone = function(){
	//IMPLEMENT LATER
}

Flora.prototype.growTo = function(x, y, z, color){
	//represents an attempt by the plant to grow to a certain point.
	//returns 1 if successful, 0 otherwise
	if (this.pot.isAvailable(x, y, z)){
		this.set(x, y, z, color);
		this.pot.set(x, y, z, color);
		return 1;
	}
	return 0;
}

Flora.prototype.update = function(dt){
	this.pot; //will error if update() is called without function being potted
	this.updatefunc(this, dt);
	this.age+=dt;
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

	//LIGHTS
	var ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );

	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );
	scene.oldpots={};

	//MATERIALS
	material = new THREE.MeshLambertMaterial( { color: 0x00ff00 });

	document.addEventListener( 'keydown', onKeyDown, false );
	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'resize', onWindowResize, false );

}

var roseGenerator = function (self, dt){
	console.log("roseGenerator called");
	var colorLiving = 0x00cc00;
	var colorPetals = 0xff3333;
	var colorCenter = 0xffcc00;
	if (this._done){
		return;
	}

	if (self._clock===undefined){ //if first time running
		self._clock=0;
		self._headpos = self.startpos;//current coordinates of rose head
		self.growTo(self._headpos.x, self._headpos.y, self._headpos.z, colorLiving);
		this._done=false;
	}

	if (Math.random()<0.2){ //grow
		if (self._headpos.y-2==0 || Math.random()<0.1){
			self.growTo(self._headpos.x, self._headpos.y-1, self._headpos.z, colorCenter);
			self.growTo(self._headpos.x, self._headpos.y-1, self._headpos.z+1, colorPetals);
			self.growTo(self._headpos.x, self._headpos.y-1, self._headpos.z-1, colorPetals);
			self.growTo(self._headpos.x+1, self._headpos.y-1, self._headpos.z, colorPetals);
			self.growTo(self._headpos.x-1, self._headpos.y-1, self._headpos.z, colorPetals);

			this._done=true;
		}
		else{
			var nx = [-1,0,0,0,0,0,1][randrange(0,6)];
			var nz = [-1,0,0,0,0,0,1][randrange(0,6)];
			console.log('headpos',self._headpos);
			if (self.growTo(self._headpos.x+nx, self._headpos.y-1, self._headpos.z+nz, colorLiving)){
				self._headpos.add(new THREE.Vector3(nx, -1, nz));
			}
		}
	}
	//random walks up, eventually creates red head
}

function generatePot(){
	var pot = new FlowerPot(new THREE.Vector3(0,0,0), 10, 10, 10);
	pot.plant(roseGenerator, new THREE.Vector3(4,9,4));
	pot.plant(roseGenerator, new THREE.Vector3(2,9,2));
	/*pot.mapfill( function(i, j, k){
		if ((Math.random())<0.1){
			return 0x33cc33;
		}
		return null;
	} );*/

	pot.group.position.set(0, 0, 0);
	pots.push(pot);
	updatePotPos();
	scene.add(pot.group);
}

function updatePotPos(){
	var distFromO = 10*(pots.length-1)/2; 
	var axis = new THREE.Vector3(0,1,0); //z axis
	var posVector = new THREE.Vector3(distFromO,7,0);
	var angle = (2*Math.PI)/pots.length;
	for(var i = 0; i < pots.length; i++){
		pots[i].group.position.set(posVector.x,posVector.y,posVector.z);
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
			generatePot();
			break;
		case 66:
			console.log("removed world");
			var pot = pots.pop();
			scene.remove(pot.group);
			updatePotPos();
			break;
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

function onMouseMove( event ) {

	event.preventDefault();

	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

	raycaster.setFromCamera( mouse, camera );

	var intersects = [];

	for(var i = 0; i < pots.length; i++){
		intersects = intersects.concat(raycaster.intersectObjects(pots[i].group.children));
	
	}

	for(var i = 0; i < intersects.length; i++) {
		intersects[i].object.parent.rotation.y+=0.01;
	}
}


function render() {
	var delta = clock.getDelta();

	for (var i=0; i<pots.length; i++){
		if (Math.random()<0.001){
			console.log(pots);
		}
		pots[i].update(delta);
		pots[i].applyToScene(scene);
	}

	for(var i = 0; i < worlds.length; i++){
		posVector.applyAxisAngle(axis, angle);
	}
	camControls.update();
	renderer.clear();
	requestAnimationFrame(render);
	renderer.render(scene, camera);
};


init();
render();