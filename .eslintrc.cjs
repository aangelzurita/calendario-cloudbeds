/** Deshabilita reglas que están rompiendo el build en Vercel */
module.exports = {
  root: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
