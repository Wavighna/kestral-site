// Hand-painted frames.
//
// Leave this array empty and the site paints a placeholder animation in code
// (so you can see the timing and layout right away).
//
// When you have your own paintings, drop them in assets/frames/ and list them
// here in order, youngest to oldest. Example:
//
//   window.KESTRAL_FRAMES = [
//     "assets/frames/01-baby.jpg",
//     "assets/frames/02-toddler.jpg",
//     "assets/frames/03-child.jpg",
//     "assets/frames/04-teen.jpg",
//     "assets/frames/05-adult.jpg"
//   ];
//
// Optional labels shown at the bottom right, one per frame:
//   window.KESTRAL_AGES = ["age 0", "age 3", "age 9", "age 16", "age 30"];
//
// Every frame must share the exact same canvas size, horizon line, tree
// position and kid position, or the animation will jump. See README.md.

window.KESTRAL_FRAMES = [];
window.KESTRAL_AGES = null;
