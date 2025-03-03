export async function handler(event) {
  console.log("Event:", JSON.stringify(event, null, 2))
  
  // Get any query parameters
  const queryParams = event.queryStringParameters || {}
  const name = queryParams.name || "World"
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Hello ${name} from LLRT!`,
      timestamp: new Date().toISOString(),
      path: event.path,
      method: event.requestContext?.http?.method
    })
  }
} 