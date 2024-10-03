import cors from "cors";
import express from "express";
import helmet from "helmet";
import pLimit from "p-limit";

const limit = pLimit(5);

const DC_ADDRESSES = [
  { name: "Hub 1", address: "172.16.136.11", status: true },
  { name: "Hub 2", address: "172.16.136.12", status: true },
  { name: "Hub 3", address: "172.16.136.13", status: true },
  { name: "Hub 4", address: "172.16.136.14", status: false },
  { name: "Hub 5", address: "172.16.136.15", status: true },
  { name: "Hub 6", address: "172.16.136.16", status: false },
];

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/health", (_, res) => {
  return res.json({ status: "UP" });
});

app.get("/status", async (_, res) => {
  const statusPromises = DC_ADDRESSES.map((dc) => {
    return limit(
      () =>
        new Promise((resolve) => {
          const client = new net.Socket();
          client.setTimeout(5000);

          client.connect(411, dc.address, () => {
            client.end();
            dc.status = true;
            resolve(dc);
          });

          client.on("timeout", () => {
            client.destroy();
            dc.status = false;
            resolve(dc);
          });

          client.on("error", () => {
            dc.status = false;
            resolve(dc);
          });
        }),
    );
  });

  const results = await Promise.all(statusPromises);
  return res.json(DC_ADDRESSES);
});

app.listen(6969, () => {
  console.log("Running on port 6969");
});
