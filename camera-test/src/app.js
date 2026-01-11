const video = document.getElementById("camera");
const startBtn = document.getElementById("start");

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = stream;
    startBtn.style.display = "none";
  } catch (err) {
    console.error(err);
    alert("Camera access failed");
  }
}

startBtn.addEventListener("click", startCamera);
