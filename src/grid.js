
function drawgrid(ctx,gridx=10,gridy=10,x=20,y=20,s=10){
ctx.strokeStyle = "red";

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
function convert(ex,ey,x,y,s){
return {x:Math.floor(ex/s)-x/s,y:Math.floor(ey/s)-y/s};
}
function highlight(ctx,x,y,gx,gy,s,color="rgba(22,0,0,0.5)"){
//drawgrid(ctx,grid.x,grid.y,grid.nx,grid.ny,grid.s);
//convert - highlight
ctx.fillStyle = color;
ctx.fillRect((x*s)+gx,(y*s)+gy,s,s);
}
export {convert,highlight};
function lerp(x,y,t){
return x*(1-t)+y*t;
}
export {lerp};
