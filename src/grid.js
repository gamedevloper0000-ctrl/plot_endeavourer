
function drawgrid(ctx,gridx=10,gridy=10,x=20,y=20,s=10,color="red"){
ctx.strokeStyle = color;

for(let i=0;i<y+1;i++){
 ctx.beginPath();
 ctx.moveTo(gridx,gridy+s*i);
 ctx.lineTo(gridx+x*s,gridy+s*i);
 ctx.stroke();
 ctx.closePath();
 }
 for(let i=0;i<x+1;i++){
 ctx.beginPath(); 
 ctx.moveTo(gridx+s*i,gridy);
 ctx.lineTo(gridx+s*i,gridy+y*s);
 ctx.stroke();
 ctx.closePath();
}
}
export {drawgrid};
function convert(ex,ey,originX,originY,s){
return {x:Math.floor((ex-originX)/s),y:Math.floor((ey-originY)/s)};
}
function highlight(ctx,x,y,originX,originY,s,color="rgba(22,0,0,0.5)"){
//drawgrid(ctx,grid.x,grid.y,grid.nx,grid.ny,grid.s);
//convert - highlight
ctx.fillStyle = color;
ctx.fillRect((x*s)+originX,(y*s)+originY,s,s);
}
export {convert,highlight};
function lerp(x,y,t){
return x*(1-t)+y*t;
}
export {lerp};
