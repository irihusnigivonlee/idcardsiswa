const express = require("express");
const multer = require("multer");
const { createCanvas, loadImage } = require("canvas");
const QRCode = require("qrcode");
const path = require("path");

const app = express();

const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use("/templates", express.static("templates"));

const dataSiswa = {};

/* =========================
   GENERATE DATA
========================= */

app.post(
  "/generate",
  upload.fields([{ name: "foto" }, { name: "logo" }]),
  async (req, res) => {
    if (!req.files["foto"] || !req.files["logo"]) {
      return res.send("Foto dan logo harus diupload");
    }

    const id = Date.now();

    dataSiswa[id] = {
      nama: req.body.nama,
      nisn: req.body.nisn,
      sekolah: req.body.sekolah,
      alamat: req.body.alamat,
      berlaku: req.body.berlaku,

      template: req.body.template || "kartu-template.png",

      foto: req.files["foto"][0].path,
      logo: req.files["logo"][0].path,
    };

    res.redirect("/preview/" + id);
  },
);

/* =========================
   PREVIEW KARTU
========================= */

app.get("/preview/:id", (req, res) => {
  res.send(`
  <h2>Preview Kartu</h2>

  <img src="/download/${req.params.id}" width="600">

  <br><br>

  <a href="/go/${req.params.id}">
  <button style="padding:10px 20px;font-size:18px">Download Kartu</button>
  </a>
  `);
});

/* =========================
   LINKVERTISE REDIRECT
========================= */

app.get("/go/:id", (req, res) => {
  const domain = req.headers.host;

  const target = "https://" + domain + "/download/" + req.params.id;

  const encoded = Buffer.from(target).toString("base64");

  const linkvertise = "https://linkvertise.com/YOUR_LINK";

  res.redirect(linkvertise + "?r=" + encoded);
});

/* =========================
   GENERATE KARTU
========================= */

app.get("/download/:id", async (req, res) => {
  const siswa = dataSiswa[req.params.id];

  if (!siswa) {
    return res.send("Data tidak ditemukan");
  }

  const canvas = createCanvas(1000, 600);
  const ctx = canvas.getContext("2d");

  /* TEMPLATE */

  const template = await loadImage(
    path.join(__dirname, "templates", siswa.template),
  );

  ctx.drawImage(template, 0, 0);

  /* LOGO */

  const logo = await loadImage(siswa.logo);
  ctx.drawImage(logo, 60, 40, 100, 100);

  /* NAMA SEKOLAH */

  ctx.font = "bold 36px Arial";

  /* isi warna huruf */
  ctx.fillStyle = "white";
  ctx.fillText(siswa.sekolah, 200, 70);

  /* outline huruf */
  ctx.lineWidth = 2;
  ctx.strokeStyle = "black";
  ctx.strokeText(siswa.sekolah, 200, 70);

  /* ALAMAT */

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(siswa.alamat, 200, 100);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "black";
  ctx.strokeText(siswa.alamat, 200, 100);

  /* FOTO SISWA */

  const foto = await loadImage(siswa.foto);
  ctx.drawImage(foto, 90, 210, 230, 280);

  /* JUDUL */

  ctx.font = "bold 46px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("KARTU PELAJAR", 300, 180);

  /* GARIS */

  ctx.beginPath();
  ctx.moveTo(90, 190);
  ctx.lineTo(900, 195);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  ctx.stroke();

  /* NAMA SISWA */

  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "black";
  ctx.fillText(siswa.nama, 350, 240);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#FFD700";
  ctx.strokeText(siswa.nama, 350, 240);

  /* NISN */

  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("NISN : " + siswa.nisn, 350, 300);

  /* MASA BERLAKU */

  ctx.font = "26px Arial";
  ctx.fillText("BERLAKU S/D : " + siswa.berlaku, 120, 550);

  /* QR CODE */

  const qr = await QRCode.toDataURL("https://idcardsiswa.com/" + req.params.id);

  const qrImage = await loadImage(qr);

  ctx.drawImage(qrImage, 350, 340, 140, 140);

  /* NOMOR KARTU */

  const nomor = "ID-" + req.params.id;

  ctx.font = "italic 18px Arial";
  ctx.fillStyle = "blue";
  ctx.fillText(nomor, 820, 560);

  /* OUTPUT */

  res.setHeader("Content-Type", "image/png");

  canvas.createPNGStream().pipe(res);
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});
