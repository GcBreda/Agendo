export default {
  content: ['./index.html', './src/**/*.{js,jsx}'] ,
  // Tema escuro ligado pela classe "dark" no <html> (TemaContext), e não só pelo sistema:
  // assim a pessoa pode escolher claro, escuro ou automático. As cores escuras estão em src/tema-escuro.css.
  darkMode: 'class',
  theme: { extend: {} } ,
  plugins: []
}
