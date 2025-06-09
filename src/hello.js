export async function handler(event) {
  try {
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
        path: event.rawPath || event.path,
        method: event.requestContext?.http?.method
      })
    }
  } catch (error) {
    console.error('Error in handler:', error)
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
} 