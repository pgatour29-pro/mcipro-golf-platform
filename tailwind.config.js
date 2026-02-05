// Generate all color variant classes used dynamically in template literals
const colors = ['red','orange','yellow','green','blue','indigo','purple','pink','teal','cyan','emerald','amber','lime','sky','violet','fuchsia','rose','gray','slate','zinc','neutral','stone'];
const shades = ['50','100','200','300','400','500','600','700','800','900','950'];
const prefixes = ['bg','text','border','ring','from','to','via','divide','outline','decoration','accent','shadow','hover:bg','hover:text','hover:border','active:border','focus:ring','focus:border'];
const safelist = [];
colors.forEach(c => {
  shades.forEach(s => {
    prefixes.forEach(p => {
      safelist.push(`${p}-${c}-${s}`);
    });
  });
});

module.exports = {
  content: ["./public/index.html", "./public/**/*.js", "./public/**/*.html"],
  safelist: safelist,
  theme: { extend: {} },
  plugins: [require("@tailwindcss/forms")],
}
