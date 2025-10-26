function srcDir(name) {
  return `^@/${name}/.*$`;
}

export default {
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: [
    "^[a-zA-Z][^/].*$",
    "^@[^/].*$",
    srcDir("(?:components|hooks)"),
    srcDir("(?:features|stores|routes)"),
    srcDir("(?:assets)"),
    `^@/.*$`,
    "^\\..?/",
  ],
  importOrderSortSpecifiers: true,
};
