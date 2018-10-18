import { launch as baseLaunch, connect as baseConnect, MessageEndpoint, Implementation } from '..';
import { ChildProcess } from 'child_process';

export function launch<T>(handler: Implementation<T>) {
  return baseLaunch(endpointForParentProcess(), handler);
}

export function connect<T>(child: ChildProcess) {
  return baseConnect<T>(endpointForChildProcess(child));
}

export function endpointForParentProcess(): MessageEndpoint {
  if (!process || !process.send) {
    throw new Error('`endpointForParentProcess` is only available in processes resulting from a fork() call');
  }

  return {
    onMessage: callback => process.addListener('message', callback),
    sendMessage: message => process.send!(message),
    disconnect: () => {
      if (process.connected) {
        process.disconnect();
      }
    }
  };
}

export function endpointForChildProcess(child: ChildProcess): MessageEndpoint {
  return {
    onMessage: callback => child.addListener('message', callback),
    sendMessage: message => child.send(message),
    disconnect: () => {
      if (child.connected) {
        child.disconnect();
      }
    }
  };
}
