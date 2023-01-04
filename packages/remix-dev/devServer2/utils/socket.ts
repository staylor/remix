import WebSocket from "ws";

type Message = { type: "RELOAD" } | { type: "LOG"; message: string };

type Broadcast = (message: Message) => void;

export let serve = (options: {
  port: number;
  delayMs: number;
}) => {
  let wss = new WebSocket.Server({ port: options.port });

  let broadcast: Broadcast = (message) => {
    setTimeout(() => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }, options.delayMs);
  };

  let reload = () => broadcast({ type: 'RELOAD'})

  let log = (messageText: string) => {
    let _message = `💿 ${messageText}`;
    console.log(_message);
    broadcast({ type: "LOG", message: _message });
  };

  return { reload, log, close: wss.close };
};
