var container, scene, camera, camControls, renderer, controls;
var clock
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