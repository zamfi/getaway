import Game from "./game.js";

const redBoxImg = new Image();
redBoxImg.src = "./assets/images/redbox.png";

class BumbleBee {
   constructor(game){
       this.game = game;
   } 

   static MarkObstacle(){
       var obstacle_count = this.game.rocks.length;
       var i;
       for(i=0;i<obstacle_count; i++){
           
       }

   }
   
  }
  
  export default BumbleBee;
  