module.exports = {
  content: ["./public/index.html", "./public/**/*.js", "./public/**/*.html"],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/forms")],
}
