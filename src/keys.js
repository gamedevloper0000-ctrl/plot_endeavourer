
window.addEventListener("keydown",(e)=>{
switch(e.key){
    case "a":
    	//keysarray[0].status = true;
	nkeys.push(0);
	if(nkeys.length > 10)break;
    case "s":
    	//keysarray[1].status = true;
	nkeys.push(1);
	if(nkeys.length > 10)break;
    case "d":
    	//keysarray[2].status = true;
	nkeys.push(2);
	if(nkeys.length > 10)break;
    case "w":
    	//keysarray[3].status = true;
	nkeys.push(3);
	if(nkeys.length > 10)break;
    case "f":
    	//keysarray[3].status = true;
	nkeys.push(4);
	//break;
     }
});

var keysarray =[{status : false},{status : false},{status : false},{status : false},{status : false}];
var nkeys = [];
function keys(obj,nkeys,keysarray,funa,funs,fund,funw,funf){
    if(nkeys.length != 0)keysarray[nkeys[0]].status = true;
   for(let i = 0;i<keysarray.length;i++){
   if(keysarray[i].status === true){
   if(i == 0)funa(obj,2);
   if(i == 1)funs(obj,2);
   if(i == 2)fund(obj,2);
   if(i == 3)funw(obj,2);
   if(i == 4)funf();
   }
   if(keysarray[i].status === true){
   keysarray[i].status = false;
   }
   }
   nkeys.pop(0);
}

export {keys,keysarray,nkeys};