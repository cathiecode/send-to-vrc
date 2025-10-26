export function lfToBr(text: string) {
  return text
    .split("\n")
    .flatMap((line) => [line, <br key={line} />])
    .slice(0, -1);
}
