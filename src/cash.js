import Sprite from "./sprite";

const cashImg = new Image();
//cashImg.src = "./assets/images/money.png";

const redBox = new Image();
redBox.src = "./assets/images/redbox.png";
class Cash {
  constructor(physics,imgSrc,marked,distance=-1) {
    this.physics = physics;
    cashImg.src = imgSrc;
    this.sprite = new Sprite(cashImg, 50, 50,1.0,1.0);
    this.box = new Sprite(redBox, 40, 50, 1, 1.3)
    this.marked = marked;
    this.distance = distance;
   
  }

  updatesprite(imgSrc) {
    cashImg.src = imgSrc;
    this.sprite = new Sprite(cashImg, 50, 50, 1.0, 1.0);
  }

  move() {
    this.physics.dDown = this.physics.speed;
  }

  stop() {
    this.physics.dDown = 0;
  }
}

export default Cash;
