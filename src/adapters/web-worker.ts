import { launch as baseLaunch, connect as baseConnect, MessageEndpoint, Implementation } from '..';

export function launch<T>(implementation: Implementation<T>) {
  return baseLaunch(endpointForParent(), implementation);
}

export function connect<T>(worker: Worker) {
  return baseConnect<T>(endpointForWorker(worker));
}

export function endpointForWorker(worker: Worker): MessageEndpoint {
  return {
    onMessage: callback => worker.addEventListener('message', event => callback(event.data)),
    sendMessage: message => worker.postMessage(message),
    disconnect: () => worker.terminate()
  };
}

export function endpointForParent(): MessageEndpoint {
  return {
    onMessage: callback => addEventListener('message', event => callback(event.data)),
    sendMessage: message => postMessage(message),
    disconnect: () => close()
  };
}
