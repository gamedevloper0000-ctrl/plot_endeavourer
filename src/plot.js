import {drawgrid} from "./grid.js";
import {convert,highlight} from "./grid.js";
var canvas = document.getElementById("mycanvas");
var landimage = document.getElementById("asset");
const ctx = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var s = canvas.height/canvas.width*100;
var money = 10000;
var bought = [];
const grid={
x:0,y:20,nx:Math.floor((canvas.width-400)/s),ny:Math.floor(canvas.height/s),size:s
}
const mouse={
x:0,y:0
};
const moused={
x:0,y:0
};
let mouseflag = false;

const gridmouse={
x:0,y:0
};

const gridmoused={
x:0,y:0
};
//economy 
//buy sell /
//world genration 

//menu
class plot{
    constructor(x,y,price,type){
this.x = x,
this.y=y,
this.price = price,
this.type = type,
this.bought = false,
this.image = new Image(),
this.image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJoAAAAfCAYAAAAfgtR8AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADZSURBVHhe7dKhEQJREATRi4UIcERBBqRCMkRABohvyAQMCZzh6sRXq7dHXIvWU1P1lvfr87fjtDy+mfbxMQbePL7+bnhz+/o8483ty/2EJzQ4oQUSGpvQ4IRWIXQnNDihBRIam9DghFYhdCc0OKEFEhqb0OCEViF0JzQ4oQUSGpvQ4IRWIXQnNDihBRIam9DghFYhdCc0OKEFEhqb0OCEViF0JzQ4oQUSGpvQ4IRWIXQnNDihBRIam9DghFYhdCc0OKEFEhqb0OCEViF0JzQ4oQWax+0YFQBQG7SoR6Qy1cp6AAAAAElFTkSuQmCC"
    }
    draw(image){
        
        ctx.drawImage(this.image,30*this.type,30*this.type,30,30,this.x,this.y,s,s);
    }
}
window.addEventListener("mousemove",function (event){
mouse.x=event.x;
mouse.y=event.y;
gridmouse.x = convert(mouse.x,mouse.y,grid.nx,grid.ny,s).x;
gridmouse.y = convert(mouse.x,mouse.y,grid.nx,grid.ny,s).y;
});

window.addEventListener("mousedown",function (event){
moused.x=event.x;
moused.y=event.y;
mouseflag = true;
gridmoused.x =(convert(moused.x,moused.y,grid.nx,grid.ny,s).x);
gridmoused.y = (convert(moused.x,moused.y,grid.nx,grid.ny,s).y);
selectgrid(moused.x,moused.y);
});
window.addEventListener("mouseup",function (event){
mouseflag= false;
});
const arrayelem = [];
function selectgrid(x,y){
   let elem = {x: convert(x,y,grid.nx,grid.ny,s).x, y: convert(x,y,grid.nx,grid.ny,s).y};
   let found = false;
   
   
   arrayelem.forEach((item)=>{
        if(item.x == elem.x && item.y == elem.y && found == false){
            found = true;
        }
   });
   if(!found){
       if(elem.x>=-1 && elem.x<grid.nx-1 && elem.y>=-1 && elem.y<grid.ny-1)arrayelem.push(elem);
   }
   else{
    deselect(elem.x,elem.y);
   }
}
function deselect(x,y){
    console.log(arrayelem,land);
    for(let i=0;i<arrayelem.length;i++){
        if(arrayelem[i].x == x && arrayelem[i].y == y){
            arrayelem.splice(i,1);
        }
    }
    for(let i=0;i<land.length;i++){
        if(land[i].x == x && land[i].y == y){
            land.splice(i,1);
            console.log(land);
        }
    }
}
var land = [];

function landquestion(){
   arrayelem.forEach((item)=>{
    land.push(new plot(item.x*s+50,item.y*s,100,0));
 
}); 
   
}
function showselection(arrayelem){
   arrayelem.forEach((item)=>{
    console.log(item.x,item.y);
    if(item.x>=-1 && item.x<grid.nx-1 && item.y>=-1 && item.y<grid.ny-1) highlight(ctx,item.x,item.y,grid.nx,grid.ny,s,"rgba(100,233,67,1)");
    
});
}

window.addEventListener('resize', () => {
resize(); 
});
function resize(){
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
grid.x =0;
grid.y=0;
grid.nx=Math.floor((canvas.width-400)/s);
grid.ny=Math.floor(canvas.height/s);
grid.size =canvas.height/canvas.width*100;
s = canvas.height/canvas.width*100;
console.log("resized");
}
function highlightongrid(x,y){
if(x>=-1 && x<grid.nx-1 && y>=-1 && y<grid.ny-1)highlight(ctx,x,y,grid.nx,grid.ny,s);
}
function drawland(){
    for(let i=0;i<land.length;i++){
        land[i].draw(landimage);
    }
}

function render(){
ctx.fillStyle="black";
ctx.fillRect(0,0,canvas.width,canvas.height);
showselection(arrayelem);
drawland();
highlightongrid(gridmouse.x,gridmouse.y);
drawgrid(ctx,0,0,grid.nx,grid.ny,s);
}
function animate(){
render();
   requestAnimationFrame(animate);
}
animate();
