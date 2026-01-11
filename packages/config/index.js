// Shared ESLint config
module.exports = {
  extends: ['next', 'prettier'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
