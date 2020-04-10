import Sprite from "./sprite";

const cashImg = new Image();
cashImg.src = "./assets/images/money.png";

const redBox = new Image();
redBox.src = "./assets/images/redbox.png";
class Cash {
  constructor(physics,marked) {
    this.physics = physics;
    this.sprite = new Sprite(cashImg, 40, 40,1.5,1.5);
    this.box = new Sprite(redBox,40,50,1.5,1.75)
    this.marked = marked;
  }

  move() {
    this.physics.dDown = this.physics.speed;
  }

  stop() {
    this.physics.dDown = 0;
  }
}

export default Cash;
