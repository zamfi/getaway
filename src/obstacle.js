import Physics from "./physics";
import Sprite from "./sprite";

const rockImg = new Image();
const redBox = new Image();
rockImg.src = "./assets/images/rock.png";
redBox.src = "./assets/images/redbox.png";
class Obstacle {
  constructor(physics) {
    this.physics = physics;
    this.sprite = new Sprite(rockImg, 30, 35,1.5,1.5);
    this.box = new Sprite(redBox,40,50,1.5,1.5)
    this.marked = true;
  }

  move() {
    this.physics.dDown = this.physics.speed;
  }

  stop() {
    this.physics.dDown = 0;
  }
}

export default Obstacle;