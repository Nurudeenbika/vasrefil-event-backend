module.exports = {
  require: ["ts-node/register"],
  extension: ["ts"],
  spec: "test/**/*.spec.ts",
  timeout: 10000,
  exit: true,
  recursive: true,
  colors: true,
};
