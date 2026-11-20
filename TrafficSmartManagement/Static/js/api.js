/** Small helper for talking to the Flask backend. POST when a body is given, otherwise GET. */
export async function api(path, body) {
  const options = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined;
  const response = await fetch(path, options);
  return response.json();
}
