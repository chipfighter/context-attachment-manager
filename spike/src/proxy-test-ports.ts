// Windows can reserve individual ephemeral ports. Reserve both engine listeners before starting a fixture.
import http from "node:http";

export async function engineTestPort(): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const first = http.createServer();
    await new Promise<void>((ok, fail) => { first.once("error", fail); first.listen(0, "127.0.0.1", ok); });
    const port = (first.address() as { port: number }).port;
    const second = http.createServer();
    const available = port < 65535 && await new Promise<boolean>(ok => {
      second.once("error", () => ok(false));
      second.listen(port + 1, "127.0.0.1", () => ok(true));
    });
    if (available) await new Promise<void>(ok => second.close(() => ok()));
    await new Promise<void>(ok => first.close(() => ok()));
    if (available) return port;
  }
  throw new Error("no adjacent loopback ports available for the synthetic engine");
}
