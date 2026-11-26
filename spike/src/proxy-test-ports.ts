// Probe both engine listeners in separate ranges below the default ephemeral ports used by loopback clients.
import http from "node:http";

const firstPorts = { h2: 12_000, http: 12_200, provider: 12_400 };

const listen = (server: http.Server, port: number) => new Promise<boolean>(resolve => {
  server.once("error", () => resolve(false));
  server.listen(port, "127.0.0.1", () => resolve(true));
});
const close = (server: http.Server) => new Promise<void>(resolve => server.close(() => resolve()));

export async function engineTestPort(suite: keyof typeof firstPorts): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const port = firstPorts[suite] + 2 * ((process.pid + attempt) % 50);
    const first = http.createServer();
    if (!(await listen(first, port))) continue;
    const second = http.createServer();
    const available = await listen(second, port + 1);
    if (available) await close(second);
    await close(first);
    if (available) return port;
  }
  throw new Error("no adjacent loopback ports available for the synthetic engine");
}
