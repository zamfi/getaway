import Game from "./game.js";

import Life from './life.js';
import Obstacle from './obstacle.js';
import Cash from './cash.js';

const redBoxImg = new Image();
redBoxImg.src = "./assets/images/redbox.png";
const lifeImgFolder = "./assets/images/life/";
const obstacleImgFolder = "./assets/images/obstacle/";
const moneyImgFolder = "./assets/images/money/";
const numImgs = 16;
window.lifeimgLst = ""
window.obstacleimgLst = ""
window.moneyImgLst = ""
const fs = require('fs')
class BumbleBee {
    constructor(game) {
        var _this = this;
       this.game = game;
       console.log(fs);
       this.lifeImgLists = [];
       this.moneyImgLists = [];
       this.obstacleImgLists = [];
       for (var i = 0; i < numImgs; i++){
           this.lifeImgLists.push(lifeImgFolder + "life (" + (i + 1).toString() + ").png");    
           this.moneyImgLists.push(moneyImgFolder + "money (" + (i + 1).toString() + ").png");    
           this.obstacleImgLists.push(obstacleImgFolder + "obstacle (" + (i + 1).toString() + ").png");    
       }
       console.log(this.lifeImgLists);
       
    }
    

    randomizesprite() {
        var rnd1 = Math.floor(Math.random() * Math.floor(numImgs));
        var rnd2 = Math.floor(Math.random() * Math.floor(numImgs));
        var rnd3 = Math.floor(Math.random() * Math.floor(numImgs));
        // this.game.lifeImgSrc = this.lifeImgLists[rnd1];
        // this.game.moneyImgSrc = this.moneyImgLists[rnd2];
        // this.game.rockImgSrc = this.obstacleImgLists[rnd3];
        console.log(this.game.lifeImgSrc);
        
    }
    
    

   static MarkObstacle(){
       var obstacle_count = this.game.rocks.length;
       var i;
       for(i=0;i<obstacle_count; i++){
           
       }

    }
    
    

   
  }
  
  export default BumbleBee;
  