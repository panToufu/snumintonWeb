import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY) {
  throw new Error("대화형 터미널에서 실행해주세요.");
}

const variableName = process.argv[2] ?? "ADMIN_PASSWORD_HASH";
if (!["ADMIN_PASSWORD_HASH", "GUEST_PASSWORD_HASH"].includes(variableName)) {
  throw new Error("지원하지 않는 환경 변수 이름입니다.");
}

process.stdout.write("해시할 비밀번호를 입력하세요: ");
process.stdin.setRawMode(true);
process.stdin.resume();

let password = "";
process.stdin.on("data", (chunk) => {
  const key = chunk.toString("utf8");
  if (key === "\u0003") process.exit(1);
  if (key === "\r" || key === "\n") {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    if (!password) throw new Error("비밀번호를 입력해주세요.");

    const salt = randomBytes(16).toString("base64url");
    const hash = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("base64url");
    // `$` is expanded by Next.js when it loads .env files, so use a delimiter
    // that survives environment-variable parsing unchanged.
    process.stdout.write(`\n\n${variableName}=scrypt:${salt}:${hash}\n`);
    process.exit(0);
  }
  if (key === "\u007f" || key === "\b") {
    password = password.slice(0, -1);
    return;
  }
  password += key;
});
