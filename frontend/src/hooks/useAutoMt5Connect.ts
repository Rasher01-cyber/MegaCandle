/** MT5 updates come from SSE on Live Market only — no global polling. */
export function useAutoMt5Connect() {
  return { linking: false, status: undefined };
}
