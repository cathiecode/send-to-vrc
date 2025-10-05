export function lfToBr(text: string) {
  return text
    .split("\n")
    .flatMap((line) => [line, <br />])
    .slice(0, -1);
}
