const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const compression = require("compression");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware untuk kompresi
app.use(compression()); // Menyediakan kompresi untuk HTTP responses

// Middleware untuk parsing JSON dan URL encoded data (gunakan Express bawaan)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Menyajikan file statis di folder views
app.use(express.static(__dirname + '/views'));

// Menyediakan file HTML untuk klien
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

// Koneksi WebSocket dengan Socket.IO
io.on("connection", (socket) => {
    console.log("Client connected");
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

// Koneksi Serial Port dengan Arduino
const port = new SerialPort({
    path: "/dev/ttyUSB0", // Ganti dengan port yang sesuai di sistem Anda
    baudRate: 9600,
});

// Parsing data yang diterima dari Arduino
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

// Tangkap data dari Arduino dan kirim ke klien melalui Socket.IO
parser.on("data", (result) => {
    console.log("Data dari Arduino ->", result);
    io.emit("data", { data: result }); // Kirim data ke semua klien yang terhubung
});

// Tangani error Serial Port
port.on("error", (err) => {
    console.error("Serial Port Error: ", err.message);
});

// Endpoint POST untuk menerima data dari klien dan mengirimkannya ke Arduino
app.post("/arduinoApi", (req, res) => {
    const data = req.body.data;

    if (!data) {
        return res.status(400).json({ error: "No data provided" });
    }

    port.write(data, (err) => {
        if (err) {
            console.error("Write error: ", err.message);
            return res.status(500).json({ error: "Failed to send data to Arduino" });
        }
        console.log("Data terkirim ke Arduino ->", data);
        res.status(200).json({ message: "Data sent successfully" });
    });
});

// Jalankan server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});