import Physics from "./physics";
import Sprite from "./sprite";

const rockImg = new Image();
const redBox = new Image();
//rockImg.src = "./assets/images/rock.png";
redBox.src = "./assets/images/redbox.png";
class Obstacle {
  constructor(physics,imgSrc,marked,distance=-1) {
    this.physics = physics;
    rockImg.src = imgSrc;
    this.sprite = new Sprite(rockImg, 50, 50,1.0,1.0);
    this.box = new Sprite(redBox,40,50,1.0,1.3)
    this.marked = marked;
    this.distance = distance;
   
  }

  updatesprite(imgSrc) {
    rockImg.src = imgSrc;
    this.sprite = new Sprite(rockImg, 50, 50, 1.0, 1.0);
  }
  

  move() {
    this.physics.dDown = this.physics.speed;
  }

  stop() {
    this.physics.dDown = 0;
  }
}

export default Obstacle;