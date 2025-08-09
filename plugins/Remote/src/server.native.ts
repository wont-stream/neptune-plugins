import { createServer } from "http";
import { WebSocketServer } from "ws";

import html from "file://web/dist/index.html";

const server = createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/html" });
	res.end(html);
});

const wss = new WebSocketServer({
	server,
});

// OP Codes
// 0: Ping
// 1: Server to Clients
// 2: Client to Server
wss.on("connection", (ws) => {
	ws.addEventListener("message", (event) => {
		const message = event.data;
		const { op } = JSON.parse(message as string);
		if (op === 0) return;
		for (const client of wss.clients) {
			if (client !== ws && client.readyState === client.OPEN) {
				client.send(message);
			}
		}
	});
});

const ping = setInterval(() => {
	wss.clients.forEach((client) => {
		if (client.readyState === client.OPEN) {
			client.send(
				JSON.stringify({
					op: 0,
				}),
			);
		}
	});
}, 10_000); // 10 seconds

const stopWebSocketServer = () => {
	server.close();
	clearInterval(ping);
};

server.listen(20941, () => {
	console.log("Server listening on port 20941");
});

export { stopWebSocketServer };
