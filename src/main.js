import {drawgrid} from "./grid.js";
import {convert,highlight} from "./grid.js";
import {lerp} from "./grid.js";
import {character} from "./myclass.js";
import {keys,keysarray,nkeys} from "./keys.js";
//render canvas
//containers

//resize
var face = "right";
var canvas = document.getElementById("mycanvas");
var bgcanvas = document.getElementById("asset");

var keyp = document.getElementById("keypressed");
const ctx = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
//var myimage = document.getElementById("gameimage");
var s = canvas.height/canvas.width*100;
var ch =[new character(0,0,s)];
var fx=0;
const grid={
x:0,y:0,nx:Math.floor(canvas.width/s),ny:Math.floor(canvas.height/s),size:s
}
const mouse={
x:0,y:0
};
const gridmouse={
x:0,y:0
};
//keyboard event
class bg{
constructor(){
    this.height = 10000,
    this.width =10000,
    this.s =100,
    this.grid={
x:0,y:0,nx:Math.floor(this.width/this.s),ny:Math.floor(this.height/this.s),size:this.s
},
this.color="blue"
}
draw(ctx){
    drawgrid(ctx,this.grid.x,this.grid.y,this.grid.nx,this.grid.ny,this.grid.size);
    ctx.drawImage(bgcanvas,this.grid.x,this.grid.y,500,500,Math.floor((0*this.s)+this.grid.x),Math.floor((0*this.s)+this.grid.y),this.width,this.height);
    
}
}
let fire = 0;
//mouse event
window.addEventListener("mousemove",function (event){
mouse.x=event.x;
mouse.y=event.y;
gridmouse.x = convert(mouse.x,mouse.y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s).x;
gridmouse.y = convert(mouse.x,mouse.y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s).y;
});



window.addEventListener('resize', () => {
resize(); 
});

let t = 0.05;
function right(obj,d){
    obj.x += lerp(0,d,t);
    obj.x = Math.min(obj.x,grid.nx-1);
    face = "right";
}
function left(obj,d){
    obj.x -= lerp(0,d,t);
    obj.x = Math.max(obj.x,0);
    face = "left";
}
function down(obj,d){
    obj.y += lerp(0,d,t);
    obj.y = Math.min(obj.y,grid.ny-1);
    face = "down";
}
function up(obj,d){
    obj.y -= lerp(0,d,t);
    obj.y = Math.max(obj.y,0);
    face = "up";
}
function fired(){
   let mode = "plant";
}
function resize(){
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
grid.x =0;
grid.y=0;
grid.nx=Math.floor(canvas.width/s);
grid.ny=Math.floor(canvas.height/s);
grid.size =canvas.height/canvas.width*100;
s = canvas.height/canvas.width*100;
console.log("resized");
}

//drawgrid(ctx,0,0,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s);
//gameloop
function frame(){
fx +=lerp(0,1,0.04);
fxx = Math.floor(fx)%5;

};

function render(){
ctx.fillStyle="black";
ctx.fillRect(0,0,canvas.width,canvas.height);
if(gridmouse.x>=-1 && gridmouse.x<grid.nx-1 && gridmouse.y>=-1 && gridmouse.y<grid.ny-1)highlight(ctx,gridmouse.x,gridmouse.y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s);
//drawgrid(ctx,0,0,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s);
frame();
//drawgrid(ctx,grid.x,grid.y,grid.nx,grid.ny,grid.size);
//fy = 10 , 25
 ctx.save();
 ctx.translate(ch[0].x,100);
background.draw(ctx);
 ctx.rotate(0); 
if(face=="right")ch[0].draw(ctx,ch[0].x,ch[0].y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s,fxx);
if(face=="left")ch[0].draw(ctx,ch[0].x,ch[0].y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s,fxx);
if(face=="down")ch[0].draw(ctx,ch[0].x,ch[0].y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s,fxx);
if(face=="up")ch[0].draw(ctx,ch[0].x,ch[0].y,Math.floor(canvas.width/s),Math.floor(canvas.height/s),s,fxx);
ctx.restore();
}
let fxx =0;
let background = new bg();
function animate(){
render();

keys(ch[0],nkeys,keysarray,left,down,right,up,fired);

   requestAnimationFrame(animate);
}
animate();