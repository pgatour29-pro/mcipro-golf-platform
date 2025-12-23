module.exports = {
  content: ["./public/**/*.html", "./public/**/*.js", "./src/**/*.js"],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/forms")],
}
