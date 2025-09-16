


 // GSAP Timeline for a clean sequence
 const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } });

 // Animate logo & "Presents"
 tl.from(".hero .title img", {
   y: -100,
   opacity: 0,
 }, ) // overlap

 .from(".hero .title p", {
   y: -20,
   opacity: 0,
 }, "-=0.4")

 // Animate heading
 .from(".hero .title h1", {
   scale: 0.8,
   opacity: 0,
   duration: 1.2,
 }, "-=0.4");

 // Animate paragraph
 tl.from(".hero .description ", {
   y: 30,
   opacity: 0,
 }, "-=0.8");

gsap.from(".left img",{
   
    opacity: 0,
    duration: 2,
    
})

 gsap.registerPlugin(ScrollTrigger);

   // Create a master timeline for more control
   gsap.utils.toArray(".eventpics img").forEach((img, i) => {
    gsap.fromTo(
      img,
      {
        opacity: 0,
        y: 100,
        scale: 0.85,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        ease: "expo.out",
        duration: 1.5,
        scrollTrigger: {
          trigger: img,
          start: "top 70%",
          end: "bottom 60%",
          scrub: false,
          toggleActions: "play none none reverse",
        },
        delay: i * 0.1, // slight offset for each image
      }
    );
  });
  gsap.from(".returnbtn", {
    x: -100, // slide in from left
    opacity: 0,
    duration: 1.2,
    ease: "power4.out",
    scrollTrigger: {
      trigger: ".returnbtn",
      start: "top 95%", // when top of button reaches 90% of viewport
      toggleActions: "play none none reverse",
    },
  });






function breaktext() {
  let h1 = document.querySelector(".title h1");
  let box = "";
  let text = h1.textContent;
  let splittedtext = text.split("");
  splittedtext.forEach(function (e) {
    box += `<span>${e}</span>`;
  });
  h1.innerHTML = box;
}

breaktext();

gsap.fromTo(
  "h1 span",
  {
    y: 100,
    opacity: 0,
  },
  {
    y: 0,
    opacity: 1,
    stagger: 0.1,
    ease: "back.inOut(1.7)",
    yoyo: true,
    repeat: -1, // infinite loop
    repeatDelay: 0.3, // optional delay between repeats
  }
);
