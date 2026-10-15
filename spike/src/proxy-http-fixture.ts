// A test-only transport: run the real engine against a plaintext loopback upstream.
// No credentials, real conversations, external TLS connections, or production hooks are used.
import net from "node:net";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const upstreamPort = Number(process.env.CAM_TEST_UPSTREAM_PORT);
if (!upstreamPort) throw new Error("missing synthetic upstream port");
// The proxy uses http.request over an already-connected TLS socket. A plain local socket exercises the same HTTP
// lifecycle; only the TLS handshake is replaced, in this isolated child process.
tls.connect = ((_options: unknown, callback: () => void) => net.connect(upstreamPort, "127.0.0.1", callback)) as typeof tls.connect;
const script = fileURLToPath(new URL("../../plugin/src/proxy.ts", import.meta.url));
process.argv = [process.execPath, script, "--stay", "--port", process.env.CAM_TEST_PROXY_PORT!];
await import(script);
