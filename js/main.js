'use strict'


var container, scene, camera, cameraPos0, cameraUp0, cameraZoom, camControls, renderer, controls;
var clock;
var planeGeo, cubeGeo, sphereGeo;
var plane, cube, sphere;
var iniQ, endQ, curQ, vec3, tweenValue;
var worlds = [];
var focus = false, focusedPot, focusedPotID, focusPosition, posVector;
var raycaster, mouse, hover = false;


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

	var allowance = 3 //non-pot grid space to leave on each side for flowers to grow into

	var potcolor = 0x996633;
	var soilcolor = 0x5f4020;

	var soilGeo = new THREE.BoxGeometry(this.x-2*allowance, 1, this.z-2*allowance);
	var soil = new THREE.Mesh(soilGeo, new THREE.MeshLambertMaterial({color: soilcolor}))
	soil.position.set(0, -this.y/2 -0.5, 0);
	this.group.add(soil);

	var potGeo = new THREE.BoxGeometry(this.x-2*allowance, 1, this.z-2*allowance);
	var potmesh = new THREE.Mesh(potGeo, new THREE.MeshLambertMaterial({color: potcolor}))
	potmesh.position.set(0, -this.y/2 -2.5, 0);
	this.group.add(potmesh);

	var sideGeo = new THREE.BoxGeometry(this.x+2- 2*allowance,3,1);
	var sidemesh = new THREE.Mesh(sideGeo, new THREE.MeshLambertMaterial({color: potcolor}))
	sidemesh.position.set(0, -this.y/2-0.5, (this.z-2*allowance)/2+0.5);
	this.group.add(sidemesh);

	var sideGeo = new THREE.BoxGeometry(this.x+2- 2*allowance,3,1);
	var sidemesh = new THREE.Mesh(sideGeo, new THREE.MeshLambertMaterial({color: potcolor}))
	sidemesh.position.set(0, -this.y/2-0.5, -(this.z-2*allowance)/2 - 0.5);
	this.group.add(sidemesh);

	var othersideGeo = new THREE.BoxGeometry(1,3,this.z + 2 - 2*allowance);
	var othersidemesh = new THREE.Mesh(othersideGeo, new THREE.MeshLambertMaterial({color: potcolor}))
	othersidemesh.position.set(-(this.z-2*allowance)/2 - 0.5, -this.y/2-0.5, 0);
	this.group.add(othersidemesh);

	var othersideGeo = new THREE.BoxGeometry(1,3,this.z + 2 - 2*allowance);
	var othersidemesh = new THREE.Mesh(othersideGeo, new THREE.MeshLambertMaterial({color: potcolor}))
	othersidemesh.position.set((this.z- 2*allowance)/2 + 0.5, -this.y/2-0.5, 0);
	this.group.add(othersidemesh);
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
	//console.log("FlowerPot.update called");
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


	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set(15,15,15);

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

	scene.add(textMesh1);

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
	window.addEventListener( 'click', onMouseClick, false );
	window.addEventListener( 'resize', onWindowResize, false );

}

var flowerGeneratorGenerator = function(_colorLiving, _colorPetals, _colorCenter, petals, maxheight){
	return function(self, dt){
		if (this._done){
			return;
		}

		self.clock+=dt;

		var colorLiving = _colorLiving;
		var colorPetals = _colorPetals;
		var colorCenter = _colorCenter;

		if (self._clock===undefined){ //if first time running
			self._clock=0;
			self._headpos = self.startpos;//current coordinates of rose head
			self.growTo(self._headpos.x, self._headpos.y, self._headpos.z, colorLiving);
			this._done=false;
			this.height=1;
		}

		if (Math.random()<0.15){ //grow
			if (this.height==maxheight || Math.random()<0.1){
				self.growTo(self._headpos.x, self._headpos.y-1, self._headpos.z, colorCenter);
				for (var i=0; i<petals.length; i++){
					self.growTo(self._headpos.x+petals[i][0], self._headpos.y-1+petals[i][1], self._headpos.z+petals[i][2], colorPetals);
				}

				this._done=true;
			}
			else{
				var nx = [-1,0,0,0,0,0,1][randrange(0,6)];
				var nz = [-1,0,0,0,0,0,1][randrange(0,6)];
				//console.log('headpos',self._headpos);
				if (self.growTo(self._headpos.x+nx, self._headpos.y-1, self._headpos.z+nz, colorLiving)){
					self._headpos.add(new THREE.Vector3(nx, -1, nz));
					this.height++;
				}
			}
		}
	}
}



var roseGenerator = flowerGeneratorGenerator(0x1f7a1f, 0xff3333, 0xffcc00, [[-1, 0, 0],[1, 0, 0],[0, 0, -1],[0, 0, 1]], 6) //green, red, yellow
var daffodilGenerator = flowerGeneratorGenerator(0x1f7a1f, 0xf4f53d, 0xffcc00, [[-1, 0, 0],[1, 0, 0],[0, 0, -1],[0, 0, 1]], 6) //green, red, yellow
var anemoneGenerator = flowerGeneratorGenerator(0x267326, 0xf0e5ff, 0x6600ff, [[-1, 0, 0],[1, 0, 0],[0, 0, -1],[0, 0, 1],[-1, -1, -1],[1, -1, 1],[1, -1, -1],[-1, -1, 1]], 6) //greenish=yellow, really light purple, purple
var carnationGenerator = flowerGeneratorGenerator(0x267326, 0xff99cc, 0xff99cc, [[-1, -2, 0],[1, -2, 0],[0, -2, -1],[0, -2, 1],[-1, 0, 0],[1, 0, 0],[0, 0, -1],[0, 0, 1],[-1, -1, -1],[1, -1, 1],[1, -1, -1],[-1, -1, 1],[0, -1, 0]], 6) //greenish=yellow, really light purple, purple
var stockGenerator = flowerGeneratorGenerator(0x1f7a1f, 0xcc99ff, 0xcc99ff, [[-1, 0, 0],[0, -1, 0],[0, -2, 0],[1,-2,0],[1,-3,0]], 4) //green, red, yellow

var generators = [roseGenerator, daffodilGenerator, anemoneGenerator, carnationGenerator, stockGenerator];

function generatePot(){
	var pot = new FlowerPot(new THREE.Vector3(0,0,0), 14, 14, 14);
	pot.plant(daffodilGenerator, new THREE.Vector3(3, pot.y-1, 3));
	pot.plant(stockGenerator, new THREE.Vector3(10, pot.y-1, 3));
	pot.plant(carnationGenerator, new THREE.Vector3(3, pot.y-1, 10));
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
	posVector = new THREE.Vector3(distFromO,7,0);
	var angle = (2*Math.PI)/pots.length;
	for(var i = 0; i < pots.length; i++){
		pots[i].group.position.set(posVector.x,posVector.y,posVector.z);
		posVector.applyAxisAngle(axis, angle);
	}
}

function reset(){

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10000 );
	camera.position.set(15,15,15);
	console.log(camera.rotation);
	console.log(camera.quaternion);

	camControls = new THREE.TrackballControls( camera );
	camControls.rotateSpeed = 10.0;
	camControls.zoomSpeed = 1.2;
	camControls.panSpeed = 0.8;
	camControls.noZoom = false;
	camControls.noPan = false;
	camControls.staticMoving = true;
	camControls.dynamicDampingFactor = 0.3;
	

}

function onKeyDown(event){
	event.preventDefault();
	switch(event.keyCode){
		case 32:
			console.log("space bar pressed");
			reset();
			updatePotPos();
			focus = false;
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
		case 90:
			console.log(camera.position);
			camera.position.addScaledVector(camera.position, -0.5);
			break;
	}
}


function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

function onMouseClick(event){

	event.preventDefault();
	if(hover != null){
		var obj =  hover[0].object.parent;
		focusedPot = obj;
		if(!focus){
			focusPosition = obj.position;
			camera.position.set(focusPosition.x, focusPosition.y, focusPosition.z);
			obj.position.set(0,7,0);
			focusedPotID = obj.id;
			console.log(obj.id);
			focus = true;
		}else if(obj.id != focusedPotID){
			updatePotPos();
			focusPosition = obj.position;
			camera.position.set(focusPosition.x, focusPosition.y, focusPosition.z);
			obj.position.set(0,7,0);
			focusedPotID = obj.id;
			focus = true;
		}
	}
}

function onMouseMove( event ) {

	event.preventDefault();
	mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
}

function getIntersect(){

	raycaster.setFromCamera( mouse, camera );

	var intersects = [];

	for(var i = 0; i < pots.length; i++){
		intersects = intersects.concat(raycaster.intersectObjects(pots[i].group.children));
	
	}

	if(intersects.length > 0){
		return intersects;
	}else{
		return null;
	}
}


function render() {



	hover = getIntersect();

	var delta = clock.getDelta();

	for (var i=0; i<pots.length; i++){
		pots[i].update(delta);
		pots[i].applyToScene(scene);
		if(hover != null) hover[0].object.parent.rotation.y += 0.009; 
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