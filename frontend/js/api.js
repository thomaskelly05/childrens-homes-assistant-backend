const API_URL = "https://api.indicare.co.uk";

export async function sendMessage(message, sessionId) {

  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message,
      session_id: sessionId
    })
  });

  return response.body;
}

export async function captureReflection(sessionId) {

  await fetch(`${API_URL}/supervision/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: sessionId
    })
  });

}
