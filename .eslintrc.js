module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  root: true,
  plugins: [
    'unicorn',
  ],
  rules: {
    semi: ['error', 'never'],
    'no-use-before-define': 'warn',
    'consistent-return': 'warn',
    'max-classes-per-file': ['error', 4],
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    quotes: ['error', 'single', { allowTemplateLiterals: true }],
    'prefer-template': 'error',
    'object-shorthand': ['warn', 'always'],
    'dot-notation': 'warn',
    'no-return-await': 'error',
    'require-await': 'error',
    'guard-for-in': 'error',
    'prefer-const': 'warn',
    'prefer-promise-reject-errors': 'error',
    'unicorn/prefer-date-now': 'error',
    'unicorn/no-new-buffer': 'error',
    'unicorn/no-static-only-class': 'error',
    'unicorn/prefer-optional-catch-binding': 'error',
    'unicorn/no-useless-undefined': 'error',
    'no-useless-catch': 'error',
    'no-multi-spaces': 'error',
    'no-invalid-this': 'error',
    'no-throw-literal': 'error',
    'no-useless-call': 'error',
    'no-extra-bind': 'error',
    'unicorn/prefer-default-parameters': 'error',
    'unicorn/empty-brace-spaces': 'warn',
    'no-extra-parens': 'warn',
  },
}
