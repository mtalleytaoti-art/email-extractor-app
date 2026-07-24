const express = require("express");
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

app.post("/extract", (req, res) => {
  const { email, password, host } = req.body;
  const contacts = new Set();

  const imap = new Imap({
    user: email,
    password: password,
    host: host,
    port: 993,
    tls: true
  });

  imap.once("ready", () => {
    imap.openBox("INBOX", true, () => {
      imap.search(["ALL"], (err, results) => {
        if (err) return res.status(500).send(err);
        const f = imap.fetch(results, { bodies: "" });
        f.on("message", msg => {
          msg.on("body", stream => {
            simpleParser(stream, (err, parsed) => {
              if (parsed.from) contacts.add(parsed.from.text);
              if (parsed.to) parsed.to.value.forEach(a => contacts.add(a.address));
              if (parsed.cc) parsed.cc.value.forEach(a => contacts.add(a.address));
              if (parsed.bcc) parsed.bcc.value.forEach(a => contacts.add(a.address));
            });
          });
        });
        f.once("end", () => {
          imap.end();
          res.json([...contacts]);
        });
      });
    });
  });

  imap.once("error", err => res.status(500).send(err));
  imap.connect();
});

app.listen(4000, () => console.log("App running on http://localhost:4000"));
