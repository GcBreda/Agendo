export default {
  content: ['./index.html', './src/**/*.{js,jsx}'] ,
  // Tema escuro ligado pela classe "dark" no <html> (TemaContext), e não só pelo sistema:
  // assim a pessoa pode escolher claro, escuro ou automático. As cores escuras estão em src/tema-escuro.css.
  darkMode: 'class',
  theme: {
    extend: {
      // Entrada suave da janela do guia "Como usar". Usada só com motion-safe:, que respeita
      // quem pediu ao sistema menos movimento na tela.
      keyframes: {
        surgir: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } }
      },
      animation: { surgir: 'surgir 180ms ease-out' }
    }
  } ,
  plugins: []
}
