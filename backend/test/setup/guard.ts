// The tests delete every row between test files. Refuse to touch anything
// that isn't a database on this machine, whatever the environment says.
export function assertLocalTestDatabase(url: string | undefined): void {
  if (!url) throw new Error("DATABASE_URL is not set for the test run");
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    throw new Error(
      `Refusing to run tests against ${host}: tests wipe the database. ` +
        "Point TEST_DATABASE_URL at a local throwaway database (scripts/test-db.sh start)."
    );
  }
}
