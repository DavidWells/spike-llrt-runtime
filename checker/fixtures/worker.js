import { parentPort } from 'worker_threads'

// Send a message back to the main thread
parentPort.postMessage('Hello from worker') 