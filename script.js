import { MTLLoader } from './threejs/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from './threejs/examples/jsm/loaders/OBJLoader.js';
var px=0;
var py=16;
var pa=0;
var speed=5;
var mvps=40;
var serverMovementSendDelay=0;
var moveForward=false;
var moveBackward=false;
var renderer,camera,scene,ws;
var assets_tl=["a","player","kivoulis"];
var assets_ind=0;
var assets=[];
var pls=[];
var materialArray=[];
function init(){
	//humble begginings
	toggleLoader(true);
	//renderer!
	renderer=new THREE.WebGLRenderer({antialias:true});
	renderer.setSize(dwh()[0],dwh()[1]);
	document.getElementById("content").appendChild(renderer.domElement);     
	//camera!                           
	camera=new THREE.PerspectiveCamera(30,dwh()[0]/dwh()[1],1,10000);
	camera.position.set(px,4,py);
	camera.up.set(0,1,0);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	//pointer!
	renderer.domElement.onclick=function(){
		renderer.domElement.requestPointerLock();
	}
	//controls!
	const onKeyDown = function ( event ) {
	switch ( event.code ) {
		case 'ArrowUp':
		case 'KeyW':
			moveForward = true;
			break;
		case 'ArrowDown':
		case 'KeyS':
			moveBackward = true;
			break;
		case 'Space':
			if ( canJump === true ) velocity.y += 350;
			canJump = false;
			break;
	}
	};
	const onKeyUp = function ( event ) {
	switch ( event.code ) {

		case 'ArrowUp':
		case 'KeyW':
			moveForward = false;
			break;
		case 'ArrowDown':
		case 'KeyS':
			moveBackward = false;
			break;
	}
	};
	document.addEventListener( 'keydown', onKeyDown );
	document.addEventListener( 'keyup', onKeyUp );
	document.addEventListener('mousemove',updatePointerPosition);
	//movement!
	window.setInterval(function(){
		doMovement();
	},1000/mvps);
	//scene!                                        
	scene = new THREE.Scene();
	//sky!
	createSky();
	//light!
	const hemi=new THREE.HemisphereLight(0xffffff,0xffffff,5);
	hemi.position.set(0,-20,0);
	scene.add(hemi);
	//world!
	const gndtex=THREE.ImageUtils.loadTexture("assets/gnd.jpg");
	gndtex.wrapS=THREE.RepeatWrapping; 
	gndtex.wrapT=THREE.RepeatWrapping;
	const ground=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshBasicMaterial({color:0x00ff00,side:THREE.DoubleSide,map:gndtex}));
	ground.position.set(0,-5,0);
	ground.rotation.set(Math.PI/2,0,0);
	scene.add(ground);
	//load!
	loadAllAssets();
	//ANIMATION!!!
	animate();
}
function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene,camera);
	camera.rotation.set(0,pa*(Math.PI/180),0);
	camera.position.set(px,4,py);
}
function doMovement(){
	var x=0;
	var y=0-speed;
	var rad=((0-pa)*Math.PI)/180;
	var s=Math.sin(rad);
	var c=Math.cos(rad);
	var nx=(x*c)-(y*s);
	var ny=(x*s)+(y*c);
	if(moveForward){
		px+=nx;
		py+=ny;
	}
	if(moveBackward){
		px-=nx;
		py-=ny;
	}
	serverMovementSendDelay++;
	if(serverMovementSendDelay>16){
		serverMovementSendDelay=0;
		cc("move",[String(px),String(py),String(pa)]);
	}
}
function updatePointerPosition(e) {
	pa-=e.movementX/6;
	if(pa>=360){
	pa-=360;
	}
	if(pa<=-360){
	pa+=360;
	}
}
function onload(){
	scene.add(getAssetByName("player"));
	wsinit();
}
function onwsload(){

}
function onwsget(message){

}
function getAssetByName(name){
	var found=-1;
	for(var i=0;i<assets_tl.length;i++){
		if(assets_tl[i]==name){
			found=i;
		}
	}
	return(assets[found]);
}
function loadAllAssets(){
	ld(assets_tl[assets_ind]);
}
function toggleLoader(state){
	if(state){
		document.getElementById("loader").style.display="block";
	}else{
		document.getElementById("loader").style.display="none";
	}
}
function ld(fn){
	var objLoader=new OBJLoader();
	var mtlLoader=new MTLLoader();
	mtlLoader.load("assets/"+fn+".mtl",function(materials){
		materials.preload();
		objLoader.setMaterials(materials);
		objLoader.load("assets/"+fn+".obj",function(object){
			assets.push(object);
			assets_ind+=1;
			if(assets_ind<assets_tl.length){
				ld(assets_tl[assets_ind]);
			}else{
				onload();
			}
		});
	});
}
function dwh(){
	var width=Math.max(
	    document.body.scrollHeight,
	    document.documentElement.scrollHeight,
	    document.body.offsetHeight,
	    document.documentElement.offsetHeight,
	    document.body.clientHeight,
	    document.documentElement.clientHeight
	);
	var height=Math.max(
	    document.body.scrollWidth,
	    document.documentElement.scrollWidth,
	    document.body.offsetWidth,
	    document.documentElement.offsetWidth,
	    document.body.clientWidth,
	    document.documentElement.clientWidth
	);
	return([height,width]);
}
function createSky(){
skyld(0);
}
function skyld(i){
	var skys=["ft","bk","up","dn","rt","lf"];
	materialArray.push(new THREE.MeshBasicMaterial({map:new THREE.TextureLoader().load("assets/sky"+skys[i]+".jpg",function(){
		if(i+1<skys.length){
			skyld(i+1);
		}else{
			for (let i = 0; i < 6; i++){materialArray[i].side=THREE.BackSide;}
			console.log(materialArray);
			console.log(new THREE.MeshFaceMaterial(materialArray));
			scene.add(new THREE.Mesh(new THREE.BoxGeometry(1600,1600,1600),new THREE.MeshFaceMaterial(materialArray)));
		}
	})}));
}
function cc(com,args){
	var composed="!"+com+":"+args.join(":");
	try{
		ws.send(composed);
	}catch(err){}
}
function wsinit(){
ws = new WebSocket("ws://localhost:9001");
ws.onopen=function(){
toggleLoader(false);
onwsload();
};
ws.onmessage=function(e){
onwsget(e.data);
};
ws.onclose=function(){
while(true){alert("ERROR - Restart the page to try to reconnect.");}
};
ws.onerror=function(e){
while(true){alert("ERROR - Restart the page to try to reconnect.");}
};
}
document.addEventListener("DOMContentLoaded",init);
